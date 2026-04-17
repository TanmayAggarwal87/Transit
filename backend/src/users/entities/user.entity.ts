import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  phone!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  emergencyContact?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'text', default: '["rider"]' })
  roles!: string;

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: true })
  refreshTokens!: RefreshToken[];

  getRoles(): string[] {
    try {
      return JSON.parse(this.roles);
    } catch {
      return ['rider'];
    }
  }

  setRoles(roles: string[]): void {
    this.roles = JSON.stringify(roles);
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  addRole(role: string): void {
    const roles = this.getRoles();
    if (!roles.includes(role)) {
      this.setRoles([...roles, role]);
    }
  }
}
