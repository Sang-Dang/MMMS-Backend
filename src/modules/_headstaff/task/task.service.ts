import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/common/base/service.base';
import { AccountEntity, Role } from 'src/entities/account.entity';
import { TaskEntity, TaskStatus, TaskType } from 'src/entities/task.entity';
import { Repository } from 'typeorm';
import { TaskRequestDto } from './dto/request.dto';
import { RequestEntity, RequestStatus } from 'src/entities/request.entity';
import { FixItemType, IssueEntity, IssueStatus } from 'src/entities/issue.entity';
import { SparePartEntity } from 'src/entities/spare-part.entity';
import { DeviceEntity } from 'src/entities/device.entity';
import { StaffGateway } from 'src/modules/notify/roles/notify.staff';
import { exportStatus, exportType, ExportWareHouse } from 'src/entities/export-warehouse.entity';

@Injectable()
export class TaskService extends BaseService<TaskEntity> {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(SparePartEntity)
    private readonly sparePartRepository: Repository<SparePartEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
    @InjectRepository(IssueEntity)
    private readonly issueRepository: Repository<IssueEntity>,
    @InjectRepository(ExportWareHouse)
    private readonly exportWareHouseRepository: Repository<ExportWareHouse>,
    private readonly staffGateway: StaffGateway
  ) {
    super(taskRepository);
  }

  async customGetAllTask(
    page: number,
    limit: number,
    status: TaskStatus,
    order?: number
  ): Promise<[TaskEntity[], number]> {
    return this.taskRepository.findAndCount({
      where: {
        status: status ? status : undefined,
      },
      relations: [
        'request',
        'fixer',
        'request.requester',
        'device',
        'device.area',
        'device.machineModel',
      ],
      order: { createdAt: order == 1 ? 'DESC' : 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async assignRenewDevice(taskId: string, renewDeviceId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['device', 'device.area', 'device.machineModel'],
    });
    if (!task) {
      throw new Error('Task not found or invalid status');
    }
    const newDevice = await this.deviceRepository.findOne({
      where: { id: renewDeviceId },
    });
    if (!newDevice) {
      throw new Error('Device not found');
    }
    task.device_renew = newDevice;

    // change the position of the old device to the new device
    newDevice.positionX = task.device.positionX;
    newDevice.positionY = task.device.positionY;
    newDevice.area = task.device.area;

    await this.deviceRepository.save(newDevice);

    // remove old device
    task.device.positionX = null;
    task.device.positionY = null;
    task.device.status = false;

    await this.deviceRepository.save(task.device);

    // Create Export Warehouse entry for the renewed device
    const exportWarehouse = new ExportWareHouse();
    exportWarehouse.task = task;
    exportWarehouse.export_type = exportType.DEVICE;
    exportWarehouse.detail = renewDeviceId;
    exportWarehouse.status = exportStatus.WAITING;

    await this.exportWareHouseRepository.save(exportWarehouse);

    return await this.taskRepository.save(task);
  }

  async customGetAllTaskDashboard(
    status: TaskStatus,
  ): Promise<[TaskEntity[], number]> {
    return this.taskRepository.findAndCount({
      where: {
        status: status ? status : undefined,
      },
    });
  }

  async getOneTask(id: string) {
    return await this.taskRepository.findOne({
      where: { id },
      relations: [
        'export_warehouse_ticket',
        'request',
        'fixer',
        'request.requester',
        'device',
        'device.area',
        'device.machineModel',
        'device.machineModel.spareParts',
        'device.machineModel.typeErrors',
        'issues',
        'issues.typeError',
        'issues.issueSpareParts',
        'issues.issueSpareParts.sparePart',
        'device_renew',
        'device_renew.machineModel',
      ],
    });
  }

  async customCreateTask(data: TaskRequestDto.TaskCreateDto) {
    // check request has been assigned to a task (status != cancelled or == completed)
    const request = await this.requestRepository.findOne({
      where: { id: data.request },
      relations: ['tasks', 'device'],
    });
    if (!request || request.status === RequestStatus.REJECTED) {
      throw new Error('Request not found or invalid status');
    }
    // let allCancelled = true;
    // for (let task of request.tasks) {
    //   if (task.status == TaskStatus.COMPLETED) {
    //     throw new Error('Request has been completed');
    //   }
    //   if (task.status !== TaskStatus.CANCELLED) {
    //     allCancelled = false;
    //   }
    // }
    // if (!allCancelled) {
    //   throw new Error('All tasks must be cancelled before creating a new task for this request');
    // }

    let newTask = new TaskEntity();
    newTask.request = request;
    newTask.device = request.device;
    // if (data.fixer) {
    //   const fixer = await this.accountRepository.findOne({
    //     where: {
    //       id: data.fixer,
    //       role: Role.staff,
    //     },
    //   });

    //   if (!fixer) {
    //     throw new Error('Fixer not found');
    //   }

    //   newTask.fixer = fixer;
    //   newTask.status = TaskStatus.ASSIGNED;
    // } else {
    //   newTask.status = TaskStatus.AWAITING_FIXER;
    // }
    let newTaskResult = await this.taskRepository.save({
      ...data,
      ...newTask,
    } as any);
    // assign issues to task
    let newIssuesAdded = await this.taskRepository
      .createQueryBuilder('task')
      .relation(TaskEntity, 'issues')
      .of(newTaskResult.id)
      .add(data.issueIDs);

    return { ...newTaskResult, issues: newIssuesAdded };
  }

  async updateTaskStausToAwaitingFixer(taskId: string) {
    // check task status is awaiting spare part and spare part quantity is enough
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: [
        'issues',
        'issues.issueSpareParts',
        'issues.issueSpareParts.sparePart',
      ],
    });
    // let issues = task.issues;
    // // check issueSpareParts of each issues is enought
    // for (let issue of issues) {
    //   for (let issueSparePart of issue.issueSpareParts) {
    //     const sparePart = await this.sparePartRepository.findOne({
    //       where: { id: issueSparePart.sparePart.id },
    //     });
    //     if (sparePart.quantity < issueSparePart.quantity) {
    //       throw new Error('Not enough spare part');
    //     }
    //   }
    // }
    // // decrease spare part quantity
    // for (let issue of issues) {
    //   for (let issueSparePart of issue.issueSpareParts) {
    //     const sparePart = await this.sparePartRepository.findOne({
    //       where: { id: issueSparePart.sparePart.id },
    //     });
    //     sparePart.quantity -= issueSparePart.quantity;
    //     await this.sparePartRepository.save(sparePart);
    //   }
    // }
    task.status = TaskStatus.AWAITING_FIXER;
    return await this.taskRepository.save(task);
  }

  async assignFixer(taskId: string, data: TaskRequestDto.TaskAssignFixerDto) {
    const task = await this.taskRepository.findOne(
      {
        where: { id: taskId },
        relations: [
          // 'export_warehouse_ticket',
          'issues',
          'issues.issueSpareParts',
          'issues.issueSpareParts.sparePart',
          'device_renew',
        ],
      },
    );
    if (!task || task.status !== TaskStatus.AWAITING_FIXER || task.fixer) {
      throw new Error('Task not found or invalid status');
    }
    const fixer = await this.accountRepository.findOne({
      where: { id: data.fixer },
    });
    task.fixer = fixer;
    task.fixerDate = new Date(data.fixerDate);
    task.status = TaskStatus.ASSIGNED;
    // get issues has issueSpareParts
    const issues = task.issues.filter((issue) =>
      issue.issueSpareParts.length > 0 ||
      issue.fixType == FixItemType.REPLACE
    );
    // create export warehouse renew
    // if (task.type === TaskType.RENEW && task.device_renew) {
    //   const exportWarehouse = new ExportWareHouse();
    //   exportWarehouse.task = task;
    //   exportWarehouse.export_type = exportType.DEVICE;
    //   exportWarehouse.detail = task.device_renew;
    //   exportWarehouse.status = exportStatus.WAITING

    //   await this.exportWareHouseRepository.save(exportWarehouse)
    // }
    if (issues.length > 0) {
      const exportWarehouse = new ExportWareHouse();
      exportWarehouse.task = task;
      exportWarehouse.export_type = task.type === TaskType.RENEW ? exportType.DEVICE : exportType.SPARE_PART;
      exportWarehouse.detail = issues;
      exportWarehouse.status = exportStatus.WAITING;
      await this.exportWareHouseRepository.save(exportWarehouse);
    }

    return await this.taskRepository.save(task);
  }

  async completeTask(id: string) {
    const task = await this.taskRepository.findOne({
      where: {
        id,
      },
      relations: ['request'],
    });

    task.status = TaskStatus.COMPLETED;
    const result = await this.taskRepository.save(task);

    // const request = await this.requestRepository.findOne({
    //   where: { id: task.request.id },
    // relations: ['issues', 'tasks'],
    // select: {
    //   issues: {
    //     id: true,
    //     status: true,
    //   },
    //   tasks: {
    //     id: true,
    //     status: true
    //   }
    // },
    // });

    // const hasUncompletedIssue = request.issues.find((issue) => {
    //   return issue.status === IssueStatus.PENDING;
    // });
    // const hasUncompletedTask = request.tasks.find((task) => {
    //   return task.status !== TaskStatus.COMPLETED;
    // })
    // if (!hasUncompletedIssue && !hasUncompletedTask) {
    //   request.status = RequestStatus.HEAD_CONFIRM;
    //   await this.requestRepository.save(request);
    // }

    return result;
  }

  async cancelTask(id: string, user: any) {
    const task = await this.taskRepository.findOne({
      where: {
        id,
      },
      relations: ['issues', 'issues.issueSpareParts'],
    });

    task.status = TaskStatus.CANCELLED;
    task.cancelBy = user.id;
    task.last_issues_data = JSON.stringify(task.issues);

    task.issues.forEach(async (issue) => {
      issue.task = null;
      await this.issueRepository.save(issue);
    });
    // if cancel task, cancel export warehouse
    const exportWarehouse = await this.exportWareHouseRepository.findOne({
      where: { task: task },
    });
    // if not exported yet then cancel, else do nothing
    if (exportWarehouse.status !== exportStatus.EXPORTED && exportWarehouse.status !== exportStatus.CANCEL) {
      exportWarehouse.status = exportStatus.CANCEL;
      await this.exportWareHouseRepository.save(exportWarehouse);
    }
    return await this.taskRepository.save(task);
  }

  async updateTask(id: string, entity: TaskRequestDto.TaskUpdateDto, userId: string) {
    const response = await this.taskRepository.update(id, entity as any).then(() => this.getOne(id));
    const responseEntity = await this.taskRepository.findOne({
      where: {
        id: response.id,
      },
      relations: ['request', 'fixer', 'request.requester', 'device', 'device.area', 'device.machineModel'],
    })

    if (entity.fixer !== null && entity.fixer !== undefined) {
      this.staffGateway.emit_task_assigned(responseEntity, userId, responseEntity.fixer.id)
    }

    return response
  }
}
