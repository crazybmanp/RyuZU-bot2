import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'Guild', synchronize: true })
export class Guild {
	@PrimaryColumn()
	id: string;

	@Column({ type: 'text' })
	name: string;
}