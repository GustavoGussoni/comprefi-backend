import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existingUser = await this.usersRepository.findByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const password = await bcrypt.hash(createUserDto.password, 12);
    const user = await this.usersRepository.create({
      ...createUserDto,
      password,
      role: createUserDto.role ?? UserRole.SALES,
    });

    return this.sanitize(user);
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.sanitize(user));
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findOne(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.sanitize(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<SafeUser> {
    const existingUser = await this.usersRepository.findOne(id);

    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const password = updateUserDto.password
      ? await bcrypt.hash(updateUserDto.password, 12)
      : undefined;

    const user = await this.usersRepository.update(
      {
        ...updateUserDto,
        password,
      },
      id,
    );

    return this.sanitize(user);
  }

  async remove(id: string): Promise<void> {
    const existingUser = await this.usersRepository.findOne(id);

    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.delete(id);
  }

  private sanitize(user: User): SafeUser {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
}
