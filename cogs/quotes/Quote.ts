import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Guild, User } from '../../model';

@Entity({ name: 'Quote' })
@Index(['guildId', 'quoteNumber'], { unique: true })
export class Quote {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	quoteNumber: number;

	@Column({ type: 'text' })
	text: string;

	@Column({ type: 'text', nullable: true })
	category?: string;

	@CreateDateColumn()
	createDate: Date;

	@UpdateDateColumn()
	updateDate: Date;

	@ManyToOne(() => Guild, guild => guild.id)
	@JoinColumn({ name: 'guildId' })
	guild: Guild;

	@Column({ nullable: false })
	guildId: string;

	@ManyToOne(() => User, creator => creator.id, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
	@JoinColumn({ name: 'creatorId'})
	creator?: User;

	@Column({ nullable: false })
	creatorId: string;
}