import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DeviceResponseDto } from './dto/response.dto';
import { DeviceService } from './device.service';
import { DeviceRequestDto } from './dto/request.dto';
import { HeadStaffGuard } from 'src/modules/auth/guards/headstaff.guard';
// import { CacheTTL } from '@nestjs/cache-manager';

@ApiTags('head staff: device')
@UseGuards(HeadStaffGuard)
@Controller('head-staff/device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @ApiBearerAuth()
  @ApiResponse({
    type: DeviceResponseDto.DeviceGetAll,
    status: 200,
    description: 'Get all Devices not have position',
  })
  @Get("/all/no-position")
  async getAll() {
    console.log("RECEIVED")
    return await this.deviceService.getAllWithRelationsNoPosition();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all machine models with unused devices"})
  @Get("/all/unused")
  async getAllUnused() {
    return await this.deviceService.getAllUnused();
  }

  // @ApiResponse({
  //   type: DeviceResponseDto.DeviceGetAll,
  //   status: 200,
  //   description: 'Get all categories',
  // })
  // @CacheTTL(10)
  // @Get('get-all-cache')
  // async getAllForUser() {
  //   return await this.deviceService.getAll();
  // }

  // @ApiBearerAuth()
  // @Get('include-deleted')
  // async getAllWithDeleted() {
  //   return await this.deviceService.getAllWithDeleted();
  // }

  @ApiResponse({
    type: DeviceResponseDto.DeviceGetOne,
    status: 200,
    description: 'Get one Device',
  })
  @ApiBearerAuth()
  @Get(':id')
  async getOneFor(@Param('id') id: string) {
    return await this.deviceService.getOneWithRelations(id);
  }

  @ApiResponse({
    type: DeviceResponseDto.DeviceGetOne,
    status: 200,
    description: 'Get one Device',
  })
  @ApiBearerAuth()
  @Get('history-request/:id')
  async getHistoryRequest(@Param('id') id: string) {
    return await this.deviceService.getHistoryRequest(id);
  }

  // @ApiBearerAuth()
  // @ApiResponse({
  //   type: DeviceResponseDto.DeviceCreate,
  //   status: 201,
  //   description: 'Create a Device',
  // })
  // @Post()
  // async create(@Body() body: DeviceRequestDto.DeviceCreateDto) {
  //   return await this.deviceService.create(
  //     DeviceRequestDto.DeviceCreateDto.plainToClass(body),
  //   );
  // }

  // @ApiBearerAuth()
  // @ApiResponse({
  //   type: DeviceResponseDto.DeviceUpdate,
  //   status: 200,
  //   description: 'Update a Device',
  // })
  // @Put(':id')
  // async update(
  //   @Param('id') id: string,
  //   @Body() body: DeviceRequestDto.DeviceUpdateDto,
  // ) {
  //   return await this.deviceService.update(
  //     id,
  //     DeviceRequestDto.DeviceUpdateDto.plainToClass(body),
  //   );
  // }

  // @ApiBearerAuth()
  // @ApiResponse({
  //   type: DeviceResponseDto.DeviceDelete,
  //   status: 200,
  //   description: 'Hard delete a Device',
  // })
  // @Delete(':id')
  // async deleteHard(@Param('id') id: string) {
  //   return await this.deviceService.delete(id);
  // }

  // @ApiBearerAuth()
  // @ApiResponse({
  //   type: DeviceResponseDto.DeviceDelete,
  //   status: 200,
  //   description: 'Soft delete a Device',
  // })
  // @Delete('soft-delete/:id')
  // async delete(@Param('id') id: string) {
  //   return await this.deviceService.softDelete(id);
  // }

  // @ApiBearerAuth()
  // @ApiResponse({
  //   type: DeviceResponseDto.DeviceRestore,
  //   status: 200,
  //   description: 'Restore a Device',
  // })
  // @Put('restore/:id')
  // async restore(@Param('id') id: string) {
  //   return await this.deviceService.restore(id);
  // }
}
