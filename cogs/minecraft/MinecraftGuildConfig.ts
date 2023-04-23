import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Guild } from '../../model';

@Entity('MinecraftGuildConfig')
@Index(['guildId'], { unique: true })
export class MinecraftGuildConfig {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Guild)
	@JoinColumn({ name: 'guildId' })
	guild: Guild;

	@Column({ nullable: false })
	guildId: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	whitelistRole: string | null;

	@Column({ type: 'text', nullable: true })
	extraWhitelistedPlayers: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	adminChannelId: string | null;
}