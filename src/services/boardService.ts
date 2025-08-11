import type { BoardState } from "../types/dataModels.ts";

const KV_KEY = ["forge_board_state"];
let kv: Deno.Kv | null = null;

const _PROD = Deno.env.get("PROD") === "true";

async function getKv() {
  if (!kv) {
    if (_PROD) {
      kv = await Deno.openKv();
    } else {
      kv = await Deno.openKv("db/dev.db.sqlite");
    }
  }
  return kv;
}

// New function to explicitly close the KV store
export function closeKvStore(): void {
  if (kv) {
    kv.close();
    kv = null; // Reset for any potential re-runs or other test suites in the same process
    // console.log("Deno KV store closed."); // Optional: for debugging
  }
}

export function getDefaultBoardState(): BoardState {
  const cardId1 = crypto.randomUUID();
  const cardId2 = crypto.randomUUID();
  const cardId3 = crypto.randomUUID();
  const cardId4 = crypto.randomUUID();
  const cardId5 = crypto.randomUUID();
  const listId1 = crypto.randomUUID();
  const listId2 = crypto.randomUUID();
  const listId3 = crypto.randomUUID();

  return {
    lists: {
      [listId1]: {
        id: listId1,
        name: "Runa",
        cardIds: [cardId3, cardId1, cardId2],
        allowsAIComponent: true,
        allowsVAIComponent: true,
        isPermanent: true,
      },
      [listId2]: {
        id: listId2,
        name: "Ima Setter",
        cardIds: [cardId5],
        allowsAIComponent: false,
        allowsVAIComponent: true,
        isPermanent: false,
      },
      [listId3]: {
        id: listId3,
        name: "Regular Column (No AI)",
        cardIds: [cardId4],
        allowsAIComponent: false,
        allowsVAIComponent: false,
        isPermanent: false,
      },
    },
    listOrder: [listId1, listId2, listId3],
    cards: {
      [cardId1]: {
        id: cardId1,
        isAIComponent: false,
        isVAIComponent: true,
        title: "DNS Change Request",
        description:
          "Determine client hosting company from domain; generate instructions for how to update DNS based on their control panel. Monitor their DNS settings for updates and notify when ready.",
      },
      [cardId2]: {
        id: cardId2,
        isAIComponent: false,
        isVAIComponent: true,
        title: "Email Draft",
        description:
          "I can use all the context I know about your clients to help you draft tricky emails to them.",
      },
      [cardId3]: {
        id: cardId3,
        isAIComponent: false,
        isVAIComponent: true,
        title: "Long Term Chat",
        description:
          "I won't forget any of the chats we have in this special chat card; they'll become context for future chats.",
      },
      [cardId4]: {
        id: cardId4,
        isAIComponent: false,
        isVAIComponent: false,
        title: "My Personal To Do",
        description: "Basic KanBan Board Functionality Is Here Too!",
      },
      [cardId5]: {
        id: cardId4,
        isAIComponent: false,
        isVAIComponent: false,
        title: "Schedule Appointment",
        description:
          "Pre-made task templates for contractors / temps that leverage AI for context, instructions, speaking and draft suggestions and questions.",
      },
    },
    config: {
      ownerId: crypto.randomUUID(),
      title: "Forge",
      description: "Forge Dev Board",
    },
  };
}

export async function getBoardState(): Promise<BoardState> {
  const store = await getKv();
  const result = await store.get<BoardState>(KV_KEY);
  if (result.value === null) {
    const defaultState = getDefaultBoardState();
    await saveBoardState(defaultState); // Save default if nothing exists
    return defaultState;
  }
  return result.value;
}

export async function saveBoardState(state: BoardState): Promise<void> {
  const store = await getKv();
  await store.set(KV_KEY, state);
}

export async function deleteColumnFromBoard(listIdToDelete: string): Promise<void> {
  const currentBoardState = await getBoardState();
  const { lists, listOrder, cards } = currentBoardState;

  // Check if the list to delete actually exists
  if (!lists[listIdToDelete]) {
    console.warn(`List with ID "${listIdToDelete}" not found for deletion.`);
    // Optionally, you could throw an error here to be caught by the API layer
    // and return a 404 Not Found response.
    // For now, we'll proceed silently if the list doesn't exist,
    // effectively making the operation idempotent for non-existent lists.
    return;
  }

  // Get card IDs from the list to be deleted
  const cardIdsToDelete = lists[listIdToDelete].cardIds || [];

  // Create new lists object without the deleted list
  const updatedLists = { ...lists };
  delete updatedLists[listIdToDelete];

  // Create new listOrder array without the deleted list's ID
  const updatedListOrder = listOrder.filter((id) => id !== listIdToDelete);

  // Create new cards object without the cards from the deleted list
  const updatedCards = { ...cards };
  cardIdsToDelete.forEach((cardId) => delete updatedCards[cardId]);

  const newBoardState: BoardState = {
    lists: updatedLists,
    listOrder: updatedListOrder,
    cards: updatedCards,
  };

  await saveBoardState(newBoardState);
}
