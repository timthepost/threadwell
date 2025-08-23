// main board container
const boardContainer = document.getElementById("board-container");

// things that trigger list creation
const addListButton = document.getElementById("add-list-button");
const newListInput = document.getElementById("new-list-name");

// things that go into card creation
const cardDialog = document.getElementById("card-dialog");
const cardTitleInput = document.getElementById("card-title-input");
const cardDescriptionInput = document.getElementById("card-description-input");
const cardIdInput = document.getElementById("card-id-input"); // Hidden input for card ID (for editing)
const cardListIdInput = document.getElementById("card-list-id-input"); // Hidden input for list ID (for new cards)
const saveCardButton = document.getElementById("save-card-button");
const cancelCardButton = document.getElementById("cancel-card-button");

const API_BASE_URL = "http://localhost:8000/api";

let boardState = {
  lists: {},
  listOrder: [],
  cards: {},
};

async function fetchBoardState() {
  try {
    const response = await fetch(`${API_BASE_URL}/board`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    boardState = await response.json();
    renderBoard();
  } catch (error) {
    console.error("Failed to fetch board state:", error);
    // You could show an error message to the user here
  }
}

async function saveCurrentBoardState() {
  try {
    const response = await fetch(`${API_BASE_URL}/board`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(boardState),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error("Failed to save board state:", error);
  }
}

function renderBoard() {
  boardContainer.innerHTML = ""; // Clear existing board

  boardState.listOrder.forEach((listId) => {
    const list = boardState.lists[listId];
    if (!list) return;

    //console.dir(list);
    const listElement = document.createElement("div");
    listElement.className = "list";
    listElement.dataset.listId = list.id;

    const listHeader = document.createElement("div");
    listHeader.className = "list-header";

    // List Name
    const listNameElement = document.createElement("h3");
    listNameElement.className = "list-name";
    const listNameString = list.name; // Use a variable for the name
   
    if (list.allowsAIComponent === true && list.isPermanent === true) {
      listNameElement.classList.add("static-rainbow-text");
    } else {
      // Default: just the list name
      listNameElement.textContent = listNameString;
    }

    listHeader.appendChild(listNameElement);

    // List Actions (Delete List button if empty, Add Card button)
    const listActionsContainer = document.createElement("div");
    listActionsContainer.className = "list-actions";

    // Add Delete Button for Empty Lists
    const isEmpty = !list.cardIds || list.cardIds.length === 0;
    if (isEmpty && !list.isPermanent) {
      const deleteListButton = document.createElement("sl-icon-button");
      deleteListButton.name = "trash";
      deleteListButton.label = "Delete empty list";
      deleteListButton.size = "small";
      deleteListButton.classList.add("delete-list-button");

      deleteListButton.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent any other parent handlers
        // Show confirmation dialog before deleting
        showDeleteListConfirmationDialog(list.id, list.name);
      });
      listActionsContainer.appendChild(deleteListButton);
    }

    // Add Card Button (always present)
    const addCardButton = document.createElement("sl-button");
    addCardButton.variant = "neutral";
    addCardButton.size = "small";
    addCardButton.innerHTML = `<sl-icon name="plus-square"></sl-icon> Add Card`;
    addCardButton.onclick = () => openCardDialog(list.id);
    listActionsContainer.appendChild(addCardButton);

    listHeader.appendChild(listActionsContainer);
    listElement.appendChild(listHeader);

    const cardsContainer = document.createElement("div");
    cardsContainer.className = "cards-container";
    cardsContainer.dataset.listId = list.id; // For SortableJS group identification

    list.cardIds.forEach((cardId) => {
      const card = boardState.cards[cardId];
      if (card) {
        cardsContainer.appendChild(createCardElement(card, list.id));
      }
    });

    listElement.appendChild(cardsContainer);
    boardContainer.appendChild(listElement);

    // Initialize SortableJS for cards in this list
    new Sortable(cardsContainer, {
      group: "shared-cards", // Cards can be moved between lists
      animation: 150,
      ghostClass: "sortable-ghost",
      draggable: ".card", // Specifies which items are draggable
      onEnd: (evt) => handleCardDrop(evt, list.id),
    });
  });

  // Initialize SortableJS for lists
  new Sortable(boardContainer, {
    animation: 150,
    ghostClass: "sortable-list-ghost",
    draggable: ".list",
    onEnd: handleListDrop,
  });
}

function createCardElement(card, listId) {
  const cardElement = document.createElement("sl-card");
  cardElement.className = "card";
  cardElement.dataset.cardId = card.id;

  const headerDiv = document.createElement("div");
  headerDiv.slot = "header";
  headerDiv.style.display = "flex";
  headerDiv.style.justifyContent = "space-between";
  headerDiv.style.alignItems = "center";

  const titleSpan = document.createElement("span");
  titleSpan.textContent = card.title;
  headerDiv.appendChild(titleSpan);

  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";

  const editButton = document.createElement("sl-icon-button");
  editButton.name = "pencil-square";
  editButton.label = "Edit Card";
  editButton.onclick = (e) => {
    e.stopPropagation(); // Prevent card drag
    openCardDialog(listId, card.id);
  };
  cardActions.appendChild(editButton);

  const deleteButton = document.createElement("sl-icon-button");
  deleteButton.name = "trash";
  deleteButton.label = "Delete Card";
  deleteButton.onclick = (e) => {
    e.stopPropagation();
    deleteCard(card.id, listId);
  };
  cardActions.appendChild(deleteButton);
  headerDiv.appendChild(cardActions);

  cardElement.appendChild(headerDiv);

  const descriptionP = document.createElement("p");
  descriptionP.textContent = card.description;
  cardElement.appendChild(descriptionP);

  return cardElement;
}

function handleListDrop(_evt) {
  const newOrder = Array.from(boardContainer.children).map((el) => el.dataset.listId);
  boardState.listOrder = newOrder;
  saveCurrentBoardState();
  // No re-render needed as SortableJS handles DOM update
}

function handleCardDrop(evt, _originalListId) {
  const _cardId = evt.item.dataset.cardId;
  const fromListId = evt.from.dataset.listId;
  const toListId = evt.to.dataset.listId;

  // Update cardIds in the 'from' list
  boardState.lists[fromListId].cardIds = Array.from(evt.from.children).map((el) => el.dataset.cardId);

  if (fromListId !== toListId) {
    // Card moved to a different list
    // 'from' list is already updated. Now update 'to' list.
    boardState.lists[toListId].cardIds = Array.from(evt.to.children).map((el) => el.dataset.cardId);
  }
  // If it's the same list, the order is already updated by the first assignment.

  saveCurrentBoardState();
  // No re-render needed as SortableJS handles DOM update, but if you had complex state, you might.
}

// Add a column to a board. Will need to handle different kinds of column types soon.

addListButton.addEventListener("click", () => {
  const listName = newListInput.value.trim();
  if (!listName) {
    alert("Please enter a list name.");
    return;
  }

  const newListId = crypto.randomUUID();
  boardState.lists[newListId] = { id: newListId, name: listName, cardIds: [] };
  boardState.listOrder.push(newListId);

  newListInput.value = "";
  saveCurrentBoardState();
  renderBoard(); // Re-render to add the new list
});

function openCardDialog(listId, cardIdToEdit = null) {
  cardListIdInput.value = listId;
  if (cardIdToEdit) {
    const card = boardState.cards[cardIdToEdit];
    cardDialog.label = "Edit Card";
    cardIdInput.value = card.id;
    cardTitleInput.value = card.title;
    cardDescriptionInput.value = card.description;
  } else {
    cardDialog.label = "Add New Card";
    cardIdInput.value = ""; // Clear for new card
    cardTitleInput.value = "";
    cardDescriptionInput.value = "";
  }
  cardDialog.show();
}

cancelCardButton.addEventListener("click", () => cardDialog.hide());

saveCardButton.addEventListener("click", () => {
  const title = cardTitleInput.value.trim();
  const description = cardDescriptionInput.value.trim();
  const listId = cardListIdInput.value;
  const existingCardId = cardIdInput.value;

  if (!title) {
    alert("Card title is required.");
    return;
  }

  if (existingCardId) { // Editing existing card
    boardState.cards[existingCardId].title = title;
    boardState.cards[existingCardId].description = description;
  } else { // New card
    const newCardId = crypto.randomUUID();
    boardState.cards[newCardId] = { id: newCardId, title, description };
    boardState.lists[listId].cardIds.push(newCardId);
  }

  cardDialog.hide();
  saveCurrentBoardState();
  renderBoard(); // Re-render to show changes or new card
});

function deleteCard(cardId, listId) {
  if (!confirm("Are you sure you want to delete this card?")) return;

  // Remove card from the list's cardIds
  boardState.lists[listId].cardIds = boardState.lists[listId].cardIds.filter((id) => id !== cardId);
  // Delete the card from the global cards object
  delete boardState.cards[cardId];

  saveCurrentBoardState();
  renderBoard(); // Re-render to reflect deletion
}

/**
 * Shows a confirmation dialog before deleting a list.
 * @param {string} listId - The ID of the list to be deleted.
 * @param {string} listName - The name of the list for the confirmation message.
 */
function showDeleteListConfirmationDialog(listId, listName) {
  const dialog = document.createElement("sl-dialog");
  dialog.label = "Confirm Deletion";

  // Using textContent for safety, but escapeHTML is better if listName could be user-input HTML
  const message = document.createElement("p");
  message.textContent =
    `Are you sure you want to delete the list "${listName}"? This action cannot be undone.`;
  dialog.appendChild(message);

  const cancelButton = document.createElement("sl-button");
  cancelButton.slot = "footer";
  cancelButton.variant = "neutral";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => dialog.hide());
  dialog.appendChild(cancelButton);

  const confirmButton = document.createElement("sl-button");
  confirmButton.slot = "footer";
  confirmButton.variant = "danger";
  confirmButton.textContent = "Delete";
  confirmButton.addEventListener("click", async () => {
    await handleDeleteList(listId);
    dialog.hide();
  });
  dialog.appendChild(confirmButton);

  dialog.addEventListener("sl-after-hide", () => {
    dialog.remove(); // Clean up dialog from DOM
  });

  document.body.appendChild(dialog);
  dialog.show();
}

/**
 * Handles the actual deletion of a list after confirmation.
 * @param {string} listId - The ID of the list to delete.
 */
async function handleDeleteList(listId) {
  try {
    const response = await fetch(`${API_BASE_URL}/board/columns/${listId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    await fetchBoardState(); // Refresh the board from the server
  } catch (error) {
    console.error(`Failed to delete list ${listId}:`, error);
    alert(`Error: Could not delete list. ${error.message}`);
  }
}

function onDOMLoaded(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    callback();
  }
}

// --- Chat Assistant Functionality ---
const chatToggleButton = document.getElementById("toggle-chat-button");
const chatDrawer = document.getElementById("chat-drawer");
const chatInput = document.getElementById("chat-input");
const sendChatMessageButton = document.getElementById("send-chat-message-button");
const chatMessagesContainer = document.querySelector("#chat-drawer .chat-messages-container");

if (chatToggleButton && chatDrawer) {
  chatToggleButton.addEventListener("click", () => {
    chatDrawer.show();
  });
} else {
  console.warn("Chat toggle button or chat drawer element not found.");
}

function addChatMessage(message, type) {
  if (!chatMessagesContainer) return;

  const messageWrapper = document.createElement("div");
  messageWrapper.classList.add("chat-message", type === "user" ? "user-message" : "assistant-message");

  const avatar = document.createElement("sl-avatar");
  avatar.initials = type === "user" ? "ME" : "AI";
  avatar.shape = "circle";

  const messageContentDiv = document.createElement("div");
  messageContentDiv.classList.add("message-content");
  messageContentDiv.textContent = message;

  if (type === "user") {
    messageWrapper.appendChild(messageContentDiv); // Content first for user
    messageWrapper.appendChild(avatar); // Avatar second for user (due to flex-direction: row-reverse)
  } else {
    messageWrapper.appendChild(avatar); // Avatar first for assistant
    messageWrapper.appendChild(messageContentDiv); // Content second for assistant
  }

  chatMessagesContainer.appendChild(messageWrapper);
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Auto-scroll
}

if (sendChatMessageButton && chatInput && chatMessagesContainer) {
  const handleSendMessage = () => {
    const messageText = chatInput.value.trim();
    if (messageText) {
      addChatMessage(messageText, "user");
      chatInput.value = ""; // Clear input
      chatInput.focus();

      // Mock AI response
      setTimeout(() => {
        addChatMessage(`I received your message: "${messageText}". How else can I help?`, "assistant");
      }, 1200);
    }
  };

  sendChatMessageButton.addEventListener("click", handleSendMessage);

  chatInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent new line in textarea
      handleSendMessage();
    }
  });
} else {
  console.warn("Chat input, send button, or messages container not found.");
}

// --- End of Chat Assistant Functionality ---

// --- Theme Switcher Functionality ---
const THEME_STORAGE_KEY = "app-theme-preference";
const DARK_THEME = "dark";
const SYSTEM_THEME = "system";

// `htmlElement` is fine at module root as document.documentElement is always available.
const htmlElement = document.documentElement;

/**
 * Applies the specified theme to the document.
 * @param {string} theme - The theme to apply ('light', 'dark', or 'system').
 */
function applyTheme(theme) {
  htmlElement.classList.remove("sl-theme-dark"); // Operates on global htmlElement

  if (theme === DARK_THEME) {
    htmlElement.classList.add("sl-theme-dark");
  } else if (theme === SYSTEM_THEME) {
    const systemPrefersDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
    if (systemPrefersDark) {
      htmlElement.classList.add("sl-theme-dark");
    }
  }
}

/**
 * Updates the checked state of menu items based on the selected theme.
 * @param {string} selectedTheme - The currently active theme.
 * @param {HTMLElement} themeMenuEl - The sl-menu element for themes.
 */
function updateMenuSelection(selectedTheme, themeMenuEl) {
  const menuItems = themeMenuEl.querySelectorAll('sl-menu-item[type="checkbox"]');
  if (menuItems.length === 0) {
    console.warn("[Theme] No menu items of type 'checkbox' found in the theme menu.");
  }
  menuItems.forEach((item) => {
    const itemValue = item.getAttribute("value");
    const shouldBeChecked = itemValue === selectedTheme;
    item.checked = shouldBeChecked;
  });
}

/**
 * Handles the theme selection from the menu.
 * Saves the preference and applies the theme.
 * @param {Event} event - The sl-select event from the sl-menu.
 * @param {HTMLElement} themeMenuEl - The sl-menu element for themes.
 */
function handleThemeSelection(event, themeMenuEl) {
  const selectedMenuItem = event.detail.item;
  if (!selectedMenuItem || typeof selectedMenuItem.value === "undefined") {
    console.warn("[Theme] Theme selection event did not yield a valid menu item or value.");
    return;
  }
  const selectedTheme = selectedMenuItem.value;
  localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
  applyTheme(selectedTheme);
  updateMenuSelection(selectedTheme, themeMenuEl);
}

/**
 * Handles changes in the system's preferred color scheme.
 * @param {HTMLElement} themeMenuEl - The sl-menu element for themes.
 */
function handleSystemThemeChange(themeMenuEl) {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === SYSTEM_THEME || !storedTheme) {
    applyTheme(SYSTEM_THEME);
    updateMenuSelection(SYSTEM_THEME, themeMenuEl);
  }
}

/**
 * Initializes the theme based on stored preference or system settings.
 * @param {HTMLElement} themeMenuEl - The sl-menu element for themes.
 */
function initializeTheme(themeMenuEl) {
  const currentTheme = localStorage.getItem(THEME_STORAGE_KEY);

  applyTheme(currentTheme);
  updateMenuSelection(currentTheme, themeMenuEl);

  const boundHandleThemeSelection = (e) => handleThemeSelection(e, themeMenuEl);
  const boundHandleSystemThemeChange = () => handleSystemThemeChange(themeMenuEl);

  themeMenuEl.removeEventListener("sl-select", boundHandleThemeSelection);
  themeMenuEl.addEventListener("sl-select", boundHandleThemeSelection);

  const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.removeEventListener("change", boundHandleSystemThemeChange);
  mediaQuery.addEventListener("change", boundHandleSystemThemeChange);
}

// --- End of Theme Switcher Functionality ---

// --- Responsive Header Functionality ---

async function initializeResponsiveHeader() {
  const hamburgerMenu = document.getElementById("hamburger-menu");
  const mainHeaderControls = document.getElementById("main-header-controls");
  const responsiveHeaderDrawer = document.getElementById("responsive-header-drawer");

  if (!hamburgerMenu || !mainHeaderControls || !responsiveHeaderDrawer) {
    console.warn(
      "One or more responsive header elements are missing from the DOM. Responsive header will not function.",
    );
    return;
  }

  // Wait for the sl-drawer custom element to be defined and upgraded
  await customElements.whenDefined("sl-drawer");
  if (
    typeof responsiveHeaderDrawer.hide !== "function" || typeof responsiveHeaderDrawer.show !== "function"
  ) {
    console.warn(
      "sl-drawer component does not seem to have hide/show methods even after whenDefined. Check Shoelace setup.",
    );
    return;
  }

  const updateHeaderLayout = () => {
    const isSmallScreen = globalThis.innerWidth < 900;
    if (!isSmallScreen) {
      responsiveHeaderDrawer.hide(); // Always hide drawer on large screens
    }
  };

  hamburgerMenu.addEventListener("click", () => responsiveHeaderDrawer.show());

  // Event listeners for items inside the responsive drawer
  const drawerAddColumnButton = document.getElementById("drawer-add-column");
  const drawerThemeSettingsButton = document.getElementById("drawer-theme-settings");
  const drawerAccountSettingsButton = document.getElementById("drawer-account-settings");

  // Dialogs for drawer actions
  const drawerAddColumnDialog = document.getElementById("drawer-add-column-dialog");
  const drawerNewColumnNameInput = document.getElementById("drawer-new-column-name-input");
  const drawerSaveAddColumnButton = document.getElementById("drawer-save-add-column-button");
  const drawerCancelAddColumnButton = document.getElementById("drawer-cancel-add-column-button");

  if (drawerAddColumnButton && drawerAddColumnDialog) {
    drawerAddColumnButton.addEventListener("click", () => {
      responsiveHeaderDrawer.hide(); // Main drawer
      drawerNewColumnNameInput.value = "";
      drawerAddColumnDialog.show();
    });
  }
  if (drawerCancelAddColumnButton && drawerAddColumnDialog) {
    drawerCancelAddColumnButton.addEventListener("click", () => drawerAddColumnDialog.hide());
  }
  if (drawerSaveAddColumnButton && drawerNewColumnNameInput && drawerAddColumnDialog) {
    drawerSaveAddColumnButton.addEventListener("click", () => {
      const listName = drawerNewColumnNameInput.value.trim();
      if (!listName) {
        alert("Please enter a column name.");
        return;
      }
      const newListId = crypto.randomUUID();
      boardState.lists[newListId] = {
        id: newListId,
        name: listName,
        cardIds: [],
        isPermanent: false,
        allowsAIComponent: false,
        allowsVAIComponent: false,
      }; // Add default properties
      boardState.listOrder.push(newListId);
      saveCurrentBoardState();
      renderBoard();
      drawerAddColumnDialog.hide();
    });
  }

  // Trigger existing controls for other drawer items
  if (drawerThemeSettingsButton) {
    drawerThemeSettingsButton.addEventListener("click", () => {
      responsiveHeaderDrawer.hide();
      document.getElementById("theme-selector-dropdown")?.show();
    });
  }
  if (drawerAccountSettingsButton) {
    drawerAccountSettingsButton.addEventListener("click", () => {
      responsiveHeaderDrawer.hide();
      document.getElementById("account-selector-dropdown")?.show();
    });
  }

  globalThis.addEventListener("resize", updateHeaderLayout);
  updateHeaderLayout(); // Initial layout check
}

// Initial load
onDOMLoaded(async () => {
  const chatToggleButton = document.getElementById("toggle-chat-button");
  const chatDrawerElement = document.getElementById("chat-drawer");
  const chatInputElement = document.getElementById("chat-input");
  const sendChatMessageButtonElement = document.getElementById("send-chat-message-button");

  if (chatToggleButton && chatDrawerElement) {
    chatToggleButton.addEventListener("click", () => {
      chatDrawerElement.show();
    });
  } else {
    console.warn("Chat toggle button or chat drawer element not found for DOMContentLoaded setup.");
  }

  if (sendChatMessageButtonElement && chatInputElement && chatMessagesContainer) {
    const handleSendMessage = () => {
      const messageText = chatInputElement.value.trim();
      if (messageText) {
        addChatMessage(messageText, "user"); // addChatMessage is global
        chatInputElement.value = "";
        chatInputElement.focus();
        setTimeout(() => {
          addChatMessage(`I received your message: "${messageText}". How else can I help?`, "assistant");
        }, 1200);
      }
    };
    sendChatMessageButtonElement.addEventListener("click", handleSendMessage);
    chatInputElement.addEventListener("keypress", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    });
  } else {
    console.warn("Chat input, send button, or messages container not found for DOMContentLoaded setup.");
  }

  // --- Theme Switcher Initialization ---
  const themeMenu = document.getElementById("theme-menu");
  if (themeMenu) {
    initializeTheme(themeMenu); // Call the module-root initializeTheme function
  } else {
    console.warn(
      '[App] CRITICAL: Theme menu element with id="theme-menu" NOT FOUND during onDOMLoaded. Theme functionality will be disabled.',
    );
  }

  // --- Initial Board Load ---
  fetchBoardState();
  await initializeResponsiveHeader();
});
