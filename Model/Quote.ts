import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Guild } from './Guild';
import { User } from './User';

@Entity({ name: 'Quote', synchronize: true })
@Index(['guildId', 'quoteNumber'], { unique: true })
export class Quote {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	quoteNumber: number;

	@Column({ type: 'text' })
	text: string;

	@Column({ type: 'text' })
	category: string;

	@CreateDateColumn()
	createDate: Date;

	@UpdateDateColumn()
	updateDate: Date;

	@ManyToOne(() => Guild, guild => guild.id)
	guild: Guild;

	@Column({ nullable: false })
	guildId: string;

	@ManyToOne(() => User, creator => creator.id, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
	creator?: User;
}