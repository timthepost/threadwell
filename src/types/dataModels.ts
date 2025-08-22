export interface Card {
  id: string;
  title: string;
  description: string;
  // Does it export objects Runa should monitor?
  isAIComponent: boolean;
}

export interface List {
  id: string;
  name: string;
  cardIds: string[]; // Ordered array of card IDs belonging to this list
  allowsAIComponent: boolean; // allows AI components
  isPermanent: boolean; // list is permanent, can not be deleted, even if empty.
}

export interface BoardConfig {
  ownerId: string;
  title: string;
  description: string;
  backgroundImage?: string;
  backgroundColorDark?: string;
  backgroundColorLight?: string;
}

export interface BoardState {
  lists: Record<string, List>; // Keyed by listId
  listOrder: string[]; // Ordered array of listIds
  cards: Record<string, Card>; // Keyed by cardId, stores all cards
  config?: BoardConfig;
}
