# Threadwell

A well of threads, or a way to manage AI assistant sessions as tasks, in a way that also "threads well" (as the original
concept started), which can also be an initial chat UI - this was that! And, well, who doesn't like a 
KanBan board to delegate and stay organized?

This is a basic kanban-style interface built using Oak, Shoelace and Sortable JS. Oak provides the perfect
background for an API-driven board and task state, Shoelace components provide a pleasing work-friendly UI
with just HTML web components and Sortable is the perfect library to make a card-and-list interface to
interact with an AI assistant.

Many things, including long turn-based conversations, can be pretty easily bucketed into cards, so this really
fits! Plus, I always wanted to make my own (you know, that thing Atlassian bought) clone.

The starter "default" cards that become available from the first run (defined in
`src/services/boardService.ts`) are as follows:

- **Simple Q&A or Context Dumps**:\
  Create a new card, attach files for context as needed, ask a question. Runa will answer it as an update to
  the card. Ask follow up questions or archive it, up to you.

- **Interactive Chat**:\
 Just ... open the assistant chat (chat bubble, bottom-right).

- **Task**:\
  Do research, write code, write content, search the web, translate things, or whatever other capabilities you
  write into it (and Runa).

## Modifying The Code

There's barely enough to even explain, but the core board handling is in `api/board.js` and immediately
familiar to anyone familiar with Oak or Express-style services.

The code in `services/boardService.js` is just fetching and saving the board state, and dealing with the list
and card objects as they change. There's no other dispatch code involved yet (this is bare bones scaffolding).
It also has a hard-coded "default" board so there's something on the first run.

The structures for it live in `types/` and are commented inline, and the client code is in `public/` and is
just Shoelace + JS to keep it framework agnostic and as free of third-party dependencies as possible.

## TODO:

 - Splinter bus integration (priority)
 - Export board state to Tieto?
 - We need more basic kanban / app creature comforts, even though this isn't supposed to be an end product.

## Security Notice

Unlike most other components developed alongside / for Runa, This does have outside dependencies, so note that 
specific versions of dependencies are specified in the hopes that their releases remain immutable. However, 
care should be taken when upgrading any of them or adding more to be aware that a potential hole for dependency 
injection does open, especially for any NPM-resolved packages, like Sortable, which is especially popular and 
thus a high-prized target by bad actors.

Even with the back-end capable of using the message bus, Deno needs access to the outside world in order for
this configuration to be useful, so allowing network access is rather necessary.

Understand how this affects your security profile overall, and proceed with sensible caution. This affects 
those who intend to use local models in order to process very confidential (e.g. medical) data, or companies
that need to process docs without a SOC impact to their terms or privacy policy due to vendors.

## PRs and Improvements

"Generic" improvements that would contribute toward any use case are welcome. Changes that specialize the base
in some way might be a little too reaching for the experience we hope this provides to Runa newcomers.
