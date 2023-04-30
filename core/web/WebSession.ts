import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('WebSession')
@Index(['token'], { unique: true })
export class WebSession {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ length: 60 })
	token: string;

	@Column({type: 'text'})
	data: string;

	@Column()
	expiresAt: Date;
}