import { Router } from "oak";
import { deleteColumnFromBoard, getBoardState, saveBoardState } from "../services/boardService.ts";
import type { BoardState } from "../types/dataModels.ts";

const router = new Router();

router
  .get("/api/board", async (ctx) => {
    try {
      const state = await getBoardState();
      ctx.response.body = state;
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Error retrieving board state in GET /api/board:", error); // Log the full error object
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to retrieve board state", details: errorMessage };
    }
  })
  .post("/api/board", async (ctx) => {
    try {
      const newState = await ctx.request.body.json() as BoardState;
      await saveBoardState(newState);
      ctx.response.status = 200;
      ctx.response.body = { message: "Board state saved successfully" };
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      ctx.response.status = 500;
      console.error("Error saving board state in POST /api/board:", error);
      ctx.response.body = { error: "Failed to save board state", details: errorMessage };
    }
  })
  .delete("/api/board/columns/:columnId", async (ctx) => {
    try {
      const { columnId } = ctx.params;
      if (!columnId) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Column ID is required" };
        return;
      }
      await deleteColumnFromBoard(columnId); // This new function will be in boardService.ts
      ctx.response.status = 200;
      ctx.response.body = { message: "Column deleted successfully" };
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) errorMessage = error.message;
      console.error(`Error deleting column in DELETE /api/board/columns/${ctx.params.columnId}:`, error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to delete column", details: errorMessage };
    }
  });

export default router;
