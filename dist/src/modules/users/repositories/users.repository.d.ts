import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
export declare abstract class UsersRepository {
    abstract create(data: CreateUserDto): Promise<User>;
    abstract findOne(id: string): Promise<User | null>;
    abstract findByEmail(email: string): Promise<User | null>;
    abstract findAll(): Promise<User[]>;
    abstract update(data: UpdateUserDto, userId: string): Promise<User>;
    abstract delete(id: string): Promise<void>;
}
