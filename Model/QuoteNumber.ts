import { Column, Entity, OneToOne, PrimaryColumn } from 'typeorm';
import { Guild } from './Guild';

@Entity({ name: 'QuoteNumber', synchronize: true })
export class QuoteNumber {
	@OneToOne(() => Guild, guild => guild.id)
	guild: Guild;

	@PrimaryColumn({ nullable: false })
	guildId: string;

	@Column({ nullable: false, default: 1 })
	nextQuoteNumber: number;
}