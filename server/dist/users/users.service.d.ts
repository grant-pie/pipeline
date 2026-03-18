import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: Repository<User>);
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(email: string, hashedPassword: string): Promise<User>;
    findByResetToken(token: string): Promise<User | null>;
    setResetToken(id: string, token: string, expiry: Date): Promise<void>;
    updatePassword(id: string, hashedPassword: string): Promise<void>;
}
