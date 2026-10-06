import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { SafeUser } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

interface RequestWithUser extends Request {
  user: SafeUser;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login do usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(
    @Req() request: RequestWithUser,
    @Body() _loginDto: LoginDto,
  ) {
    return this.authService.login(request.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna a sessão autenticada atual' })
  @ApiResponse({ status: 200, description: 'Sessão válida' })
  @ApiResponse({ status: 401, description: 'Sessão inválida ou expirada' })
  async me(@Req() request: RequestWithUser) {
    return this.authService.me(request.user.id);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registra um usuário administrativo' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já está em uso' })
  @ApiResponse({ status: 403, description: 'Papel sem permissão' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
