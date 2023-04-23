import { Column, Entity, JoinColumn, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Guild } from '../../model';

@Entity({ name: 'MinecraftServer' })
@Index(['guildId', 'name'], { unique: true })
export class MinecraftServer {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Guild, guild => guild.id)
	@JoinColumn({ name: 'guildId' })
	guild: Guild;

	@Column({ nullable: false })
	guildId: string;

	@Column({ nullable: false, type: 'text' })
	name: string;

	@Column({ default: true })
	enabled: boolean;

	@Column({ default: false })
	needsSync: boolean;

	@Column({ length: 255 })
	rconHost: string;

	@Column()
	rconPort: number;

	@Column({ length: 255 })
	rconPassword: string;

	@Column({ default: true })
	managedWhitelist: boolean;
}