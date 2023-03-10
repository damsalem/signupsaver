const bookmarks = document.querySelector("#bookmarks");
const saveSupButton = document.querySelector("#save");
const changeText = document.querySelector("#changeText");

// Run when extension is clicked
document.addEventListener("DOMContentLoaded", async function () {
	// Search for existing folder
	let folderId = await getSignUpSaverFolderId();

	if (!folderId) {
		return;
	}
	// Query bookmarks for matches
	const bookmarks = await getAllSignUpSaverBookmarks(folderId);

	// Update popup unordered list
	setupBookmarkList(bookmarks);

	// Handle clicks to delete buttons
	const deleteButtons = document.querySelectorAll(".delete");
	deleteButtons.forEach((button) => {
		button.addEventListener("click", (event) => {
			const bookmarkId = event.target.dataset.id;
			deleteUpdateList(bookmarkId);
		});
	});
});

// Handle clicks to [Save Sign Up] button
saveSupButton.addEventListener("click", (event) => handleSaveSup(event));

async function handleSaveSup(event) {
	event.preventDefault();
	// Get the current/active tab
	const [activeTab] = await chrome.tabs.query({
		active: true,
		currentWindow: true,
	});

	const activeTabTitle = activeTab.title;
	const activeTabUrl = activeTab.url;

	// Search or create folder
	const folderId = await searchOrCreateSignUpSaverFolder();

	// Create the bookmark
	const { id, title, url, isExistingBookmark } = await createBookmark(
		activeTabTitle,
		activeTabUrl,
		folderId
	);

	if (!title && !url && isExistingBookmark) {
		// Not a valid page to bookmark
		toggleChangeText("notSug");
		return;
	}

	if (isExistingBookmark) {
		// Bookmark aleady exists
		toggleChangeText("exists");
		return;
	}
	// Update popup unordered list
	const newLi = addToBookmarkList(title, url, id);

	// Add event listener for delete button
	newLi.addEventListener("click", (event) => {
		const bookmarkId = event.target.dataset.id;
		deleteUpdateList(bookmarkId);
	});

	// Toggle change text in popup
	toggleChangeText("addition");
}

/****
 *
 * CRUD Functions for Bookmarks
 *
 ****/

// Search for folder, if it doesn't exist, create it
async function searchOrCreateSignUpSaverFolder() {
	let folderId = await getSignUpSaverFolderId();
	if (!folderId) {
		folderId = await createSignUpSaverFolderId();
	}
	return folderId;
}

// Delete bookmarks and update list
async function deleteUpdateList(id) {
	// Delete bookmark
	deleteBookmarkById(id);

	// Search for existing folder
	let folderId = await getSignUpSaverFolderId();

	// Query bookmarks for matches
	const bookmarks = await getAllSignUpSaverBookmarks(folderId);

	// Update delete li from unordered list
	const deleteButton = document.querySelector(`[data-id="${id}"`);
	const li = deleteButton.parentElement;
	li.remove();
}

// Search for SignUpSaver folder
async function getSignUpSaverFolderId(
	query = "SignUpSaver",
	title = "SignUpSaver"
) {
	const folder = await chrome.bookmarks.search({ query, title });
	// If folder found, return the id, else return null
	return folder.length > 0 ? folder[0].id : null;
}

// Create SignUpSaver folder
async function createSignUpSaverFolderId(title = "SignUpSaver") {
	const folder = await chrome.bookmarks.create({ title: title });
	return folder.id;
}

// Search for bookmarks within the folder
async function getAllSignUpSaverBookmarks(id) {
	return await chrome.bookmarks.getChildren(id);
}

// Create SignUpSaver bookmark
async function createBookmark(tabTitle, tabUrl, folderId) {
	let isExistingBookmark = false;
	const query = { title: tabTitle, url: tabUrl };

	if (!tabUrl.match(/.*signupgenius\.com\/go\/.*/i)) {
		isExistingBookmark = true;
		return { title: "", url: "", isExistingBookmark };
	}

	const [existingBookmark] = await chrome.bookmarks.search(query);
	if (existingBookmark && Object.keys(existingBookmark).length !== 0) {
		isExistingBookmark = true;
		return { ...existingBookmark, isExistingBookmark };
	}

	const newBookmark = await chrome.bookmarks.create({
		title: tabTitle,
		url: tabUrl,
		parentId: folderId,
		index: 0,
	});

	return { ...newBookmark, isExistingBookmark };
}

// Delete SignUpSaver bookmark
async function deleteBookmarkById(id) {
	return await chrome.bookmarks.remove(id);
}

/****
 *
 * Update Popup.html
 *
 ****/

// Toggle ChangeText
// parameters include: "addition", "removal", and "exists"
function toggleChangeText(change = "addition") {
	switch (change) {
		case "addition":
			changeText.innerHTML = "Bookmark added";
			break;
		case "removal":
			changeText.innerHTML = "Bookmark removed";
			break;
		case "exists":
			changeText.innerHTML = "Bookmark already exists";
			break;
		case "notSug":
			changeText.innerHTML = "That doesn't look like a Sign Up!";
			break;
		default:
			changeText.innerHTML = "Hmmm that didn't work";
	}
	changeText.style.visibility = "visible";

	setTimeout(function hideText() {
		changeText.style.visibility = "hidden";
	}, 2000);
}

// Get Relevant Bookmarks and Populate List
function setupBookmarkList(tabTitleArray) {
	tabTitleArray.forEach(({ title, url, id }) => {
		const shortenedTitle = title
			.split(" ")
			.slice(0, 3)
			.join(" ")
			.substring(0, 25)
			.trim();
		const link = document.createElement("a");
		link.href = url;
		link.target = "_blank";
		link.innerText = shortenedTitle;

		const deleteButton = document.createElement("span");
		deleteButton.innerText = "X";
		deleteButton.className = "delete";
		deleteButton.dataset.id = id;

		const li = document.createElement("li");
		li.className = "bookmark";
		li.appendChild(link);
		li.appendChild(deleteButton);

		bookmarks.appendChild(li);
	});
}

// Add Latest Bookmark to List
function addToBookmarkList(title, url, id) {
	const shortenedTitle = title
		.split(" ")
		.slice(0, 3)
		.join(" ")
		.substring(0, 25)
		.trim();
	const link = document.createElement("a");
	link.href = url;
	link.target = "_blank";
	link.innerText = shortenedTitle;

	const deleteButton = document.createElement("span");
	deleteButton.innerText = "X";
	deleteButton.className = "delete";
	deleteButton.dataset.id = id;

	const li = document.createElement("li");
	li.className = "bookmark";
	li.appendChild(link);
	li.appendChild(deleteButton);

	if (bookmarks.firstChild) {
		bookmarks.insertBefore(li, bookmarks.firstChild);
	} else {
		bookmarks.appendChild(li);
	}

	return li;
}
