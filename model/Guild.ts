import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'Guild' })
export class Guild {
	@PrimaryColumn()
	id: string;

	@Column({ type: 'text' })
	name: string;
}