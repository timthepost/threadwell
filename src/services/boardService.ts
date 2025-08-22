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

// This populates a "demo" board state to show one possible use where:
// One column where AI is expected to complete every card in it, like a todo
// One column where AI only helps in parts of the workflow
// One column where AI doesn't monitor (but is still accessible via boardService)
// aiComponent = Expected to get queued in bulk and dispatched, monitors for activity on the whole card
// vaiComponent = work gets dispatched surgically, runa is told what to monitor after doing them
// Still very much in design - this isn't an "end product", it's more a way to test as many things in one
// place while still being useful.
export function getDefaultBoardState(): BoardState {
  const cardId1 = crypto.randomUUID();
  const cardId2 = crypto.randomUUID();
  const cardId3 = crypto.randomUUID();
  const cardId4 = crypto.randomUUID();
  const cardId5 = crypto.randomUUID();
  const cardId6 = crypto.randomUUID();
  const listId1 = crypto.randomUUID();
  const listId2 = crypto.randomUUID();

  return {
    lists: {
      // Assistant does everything in the assigned tasks, updates them
      // with completion and notes
      [listId1]: {
        id: listId1,
        name: "Augmented Tasks",
        cardIds: [cardId6, cardId3, cardId1, cardId2],
        allowsAIComponent: true,
        isPermanent: true,
      },
      // No automatic dispatch to Runa on events - just a regular ole' 
      // list / card system. 
      [listId2]: {
        id: listId2,
        name: "Regular List (No AI)",
        cardIds: [cardId4],
        allowsAIComponent: false,
        isPermanent: false,
      },
    },
    listOrder: [listId1, listId2],
    cards: {
      [cardId1]: {
        id: cardId1,
        isAIComponent: true,
        title: "Extract And Translate",
        description:
          "Extract all text from PDFs and translate into English, Markdown format.",
      },
      [cardId2]: {
        id: cardId2,
        isAIComponent: false,
        title: "Email Draft",
        description:
          "Research this company and help me draft a cold cover letter.",
      },
      [cardId3]: {
        id: cardId3,
        isAIComponent: false,
        title: "News Summarization",
        description:
          "Blend and summarize my news feed from RSS feeds provided below:",
      },
      [cardId4]: {
        id: cardId4,
        isAIComponent: false,
        title: "My Personal To Do",
        description: "Basic KanBan Board Functionality Is Here Too!",
      },
      [cardId5]: {
        id: cardId5,
        isAIComponent: false,
        title: "Cooperative Workflow",
        description:
          "Pre-made task templates where AI is expected to only do some of the work instead of all of it.",
      },
      [cardId6]: {
        id: cardId6,
        isAIComponent: true,
        title: "Document Search",
        description:
          "Point me at a bunch of documents and ask me questions about them!",
      },
    },
    config: {
      ownerId: crypto.randomUUID(),
      title: "Threadwell",
      description: "Threadwell Demo Board",
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
    // should probably throw here so the API layer communicates it back.
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
  // todo: use Tieto here as a board object store (no need for DenoKV / SQLite3)
}
