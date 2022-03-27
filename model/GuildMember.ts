import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Guild } from './Guild';
import { User } from './User';

@Entity({ name: 'GuildMember', synchronize: true })
export class GuildMember {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Guild, guild => guild.id)
	@JoinColumn({ name: 'guildId' })
	guild: Guild;

	@Column({ nullable: false })
	guildId: string;

	@ManyToOne(() => User, user => user.guildMember)
	@JoinColumn({ name: 'userId' })
	user: User;

	@Column({ nullable: false })
	userId: string;

	@Column({ nullable: true})
	nickname?: string;
}