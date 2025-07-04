import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
// import { CacheTTL } from '@nestjs/cache-manager';
import { TaskService } from './task.service';
import { HeadStaffGuard } from 'src/modules/auth/guards/headstaff.guard';
import { TaskResponseDto } from './dto/response.dto';
import { TaskRequestDto } from './dto/request.dto';
import { TaskStatus } from 'src/entities/task.entity';

@ApiTags('head staff: task')
@UseGuards(HeadStaffGuard)
@Controller('head-staff/task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @ApiBearerAuth()
  @ApiResponse({
    type: TaskResponseDto.TaskGetAll,
    status: 200,
    description: 'Get all Tasks',
  })
  @Get(':page/:limit/:status')
  getAll(
    @Param('page') page: number,
    @Param('limit') limit: number,
    @Param('status') status: TaskStatus,
    @Query('order') order: number
  ) {
    return this.taskService.customGetAllTask(page, limit, status, order);
  }

  // @ApiResponse({
  //   type: TaskResponseDto.TaskGetAll,
  //   status: 200,
  //   description: 'Get all categories',
  // })
  // @CacheTTL(10)
  // @Get('get-all-cache')
  // async getAllForUser() {
  //   return await this.taskService.getAll();
  // }

  @ApiBearerAuth()
  @Get('include-deleted')
  async getAllWithDeleted() {
    return await this.taskService.getAllWithDeleted();
  }

  @ApiResponse({
    type: TaskResponseDto.TaskGetOne,
    status: 200,
    description: 'Get one Task',
  })
  @ApiBearerAuth()
  @Get(':id')
  async getOneFor(@Param('id') id: string) {
    return await this.taskService.getOneTask(id);
  }

  @ApiBearerAuth()
  @ApiResponse({
    type: TaskResponseDto.TaskCreate,
    status: 201,
    description: 'Create a Task',
  })
  @Post()
  async create(@Body() body: TaskRequestDto.TaskCreateDto) {
    return await this.taskService.customCreateTask(
      TaskRequestDto.TaskCreateDto.plainToClass(body),
    );
  }

  @ApiBearerAuth()
  @ApiResponse({
    type: TaskResponseDto.TaskUpdate,
    status: 200,
    description: 'Update a Task',
  })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: TaskRequestDto.TaskUpdateDto,
    @Headers('user') user: any,
  ) {
    return await this.taskService.updateTask(
      id,
      TaskRequestDto.TaskUpdateDto.plainToClass(body),
      user.id
    );
  }

  @ApiBearerAuth()
  @Put('/assign-renew-device/:taskId/:renewDeviceId')
  async assignRenewDevice(
    @Param('taskId') taskId: string,
    @Param('renewDeviceId') renewDeviceId: string,
  ) {
    return await this.taskService.assignRenewDevice(taskId, renewDeviceId);
  }

  @ApiBearerAuth()
  @ApiResponse({
    type: TaskResponseDto.TaskUpdate,
    status: 200,
    description: 'Update a Task status to awaiting fixer',
  })
  @Put('update-task-to-awatting-fixer/:id')
  async updateTaskStausToAwaitingFixer(@Param('id') taskId: string) {
    return await this.taskService.updateTaskStausToAwaitingFixer(taskId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete a Task',
    description:
      'Complete a task by updating status and update request status if all tasks are finished',
  })
  @Put(':id/complete')
  async completeTask(@Param('id') id: string) {
    return this.taskService.completeTask(id);
  }

  @ApiBearerAuth()
  @ApiResponse({
    type: TaskResponseDto.TaskUpdate,
    status: 200,
    description: 'Update a Task',
  })
  @Put('assign-fixer/:id')
  async assignFixer(
    @Param('id') id: string,
    @Body() body: TaskRequestDto.TaskAssignFixerDto,
  ) {
    return await this.taskService.assignFixer(
      id,
      TaskRequestDto.TaskAssignFixerDto.plainToClass(body),
    );
  }

  @ApiBearerAuth()
  @ApiOperation({summary: "Cancel a task"})
  @Put('cancel/:id')
  async cancelTask(@Param('id') id: string, @Headers('user') user: any,) {
    return await this.taskService.cancelTask(id, user);
  }

  @ApiBearerAuth()
  @ApiResponse({
    type: TaskResponseDto.TaskDelete,
    status: 200,
    description: 'Hard delete a Task',
  })
  @Delete(':id')
  async deleteHard(@Param('id') id: string) {
    return await this.taskService.delete(id);
  }

  @ApiBearerAuth()
  @ApiResponse({
    type: TaskResponseDto.TaskDelete,
    status: 200,
    description: 'Soft delete a Task',
  })
  @Delete('soft-delete/:id')
  async delete(@Param('id') id: string) {
    return await this.taskService.softDelete(id);
  }

  @ApiBearerAuth()
  @ApiResponse({
    type: TaskResponseDto.TaskRestore,
    status: 200,
    description: 'Restore a Task',
  })
  @Put('restore/:id')
  async restore(@Param('id') id: string) {
    return await this.taskService.restore(id);
  }
}
