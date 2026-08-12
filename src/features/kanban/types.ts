export const BOARD_ID = "board";

export interface Card {
	id: string;
	title: string;
	description: string;
}

export interface Column {
	id: string;
	title: string;
	color: string;
	cards: Card[];
}

export interface CardDialogState {
	columnId: string;
	card: Card;
}

export type ConfirmDialogState =
	| { kind: "card"; columnId: string; cardId: string; title: string }
	| { kind: "column"; columnId: string; title: string };
