import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({name:"Quotes", synchronize: true})
export class Quotes {
    @PrimaryGeneratedColumn()
    id;

    @Column({type: "text"})
    text;

    @Column({type: "text"})
    category;
}