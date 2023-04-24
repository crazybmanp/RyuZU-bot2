import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { GuildMember } from '../../model';

@Entity('MinecraftPlayer')
@Index(['memberId'], { unique: true })
export class MinecraftPlayer {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => GuildMember)
	@JoinColumn({ name: 'memberId' })
	member: GuildMember;

	@Column({ nullable: false })
	memberId: number;

	@Column({ type: 'varchar', length: 255, nullable: true })
	minecraftUsername: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	minecraftUuid: string | null;

	@Column({ default: false })
	blocked: boolean;
}