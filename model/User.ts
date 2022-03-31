import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { GuildMember } from './GuildMember';

@Entity({ name: 'User', synchronize: true })
export class User {
	@PrimaryColumn()
	id: string;

	@OneToMany(() => GuildMember, guildMember => guildMember.user)
	guildMember?: GuildMember[];

	@Column()
	displayName: string;

	@Column()
	discriminator: string;
}