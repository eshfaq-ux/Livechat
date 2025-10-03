```javascript
/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// --- Mock Data ---
const MOCK_LOGGED_IN_USER = {
  uid: 'user123',
  displayName: 'My Name',
  profileImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_XJdnC9AWDwo_M2g682nhZpAm0IxO3HxBk1VFHpY3qQ&s'
};

const MOCK_OTHER_USER_1 = {
  uid: 'user456',
  displayName: 'Bob',
  profileImage: 'https://example.com/bob.png'
};

const MOCK_OTHER_USER_2 = {
  uid: 'user789',
  displayName: 'Charlie',
  profileImage: 'https://example.com/charlie.png'
};

const MOCK_USERS_DB = {
  [MOCK_LOGGED_IN_USER.uid]: MOCK_LOGGED_IN_USER,
  [MOCK_OTHER_USER_1.uid]: MOCK_OTHER_USER_1,
  [MOCK_OTHER_USER_2.uid]: MOCK_OTHER_USER_2,
};

// --- Mocking Firebase ---
// We capture the callbacks passed to Firebase listeners to trigger them manually in our test.
let onAuthStateChangedCallback;
let onValueUsersCallback;

jest.mock("https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js", () => ({
  initializeApp: jest.fn(() => ({}))
}));

jest.mock("https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js", () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // Capture the callback to simulate user login state changes.
    onAuthStateChangedCallback = callback;
  }),
  signOut: jest.fn(),
}));

jest.mock("https://www.gstatic.com/firebasejs/10.6.0/firebase-database.js", () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(),
  onValue: jest.fn((ref, callback) => {
    // This mock assumes the first call to onValue is for the 'users' list.
    // For more complex scenarios, the mock for ref() could be enhanced to differentiate.
    onValueUsersCallback = callback; // Capture the callback to simulate database updates.
  }),
  set: jest.fn(),
}));


describe('Live Chat UI', () => {

  let document;

  beforeEach(() => {
    // Load the HTML file content into JSDOM for each test
    const html = fs.readFileSync(path.resolve(__dirname, 'livechat.html'), 'utf8');
    
    // The JSDOM constructor needs to be configured to execute the scripts
    const dom = new (require('jsdom').JSDOM)(html, { runScripts: "dangerously" });
    document = dom.window.document;
    
    // Reset captured callbacks before each test to ensure isolation
    onAuthStateChangedCallback = null;
    onValueUsersCallback = null;

    // The script in the HTML file runs upon DOM creation, setting up the firebase listeners.
    // The test will then trigger those listeners with mock data.
  });

  test("Verify that the logged-in user's own profile information is correctly displayed in the user list header and that they do not appear in the chat list itself.", () => {
    // 1. Simulate a user successfully authenticating.
    // This triggers the onAuthStateChanged callback captured from the script.
    if (!onAuthStateChangedCallback) {
        throw new Error("onAuthStateChanged listener was not set up by the script.");
    }
    onAuthStateChangedCallback(MOCK_LOGGED_IN_USER);

    // 2. Simulate the database returning the list of all users.
    // This triggers the onValue callback for the users' database reference.
    const mockSnapshot = {
      val: () => MOCK_USERS_DB
    };
    if (!onValueUsersCallback) {
        throw new Error("onValue listener for users was not set up by the script.");
    }
    onValueUsersCallback(mockSnapshot);

    // 3. Assertions for the logged-in user's header information.
    const myNameLabel = document.getElementById('myName');
    const profileImage = document.getElementById('profileImage');

    expect(myNameLabel.innerHTML).toBe(MOCK_LOGGED_IN_USER.displayName);
    expect(profileImage.src).toBe(MOCK_LOGGED_IN_USER.profileImage);

    // 4. Assertions for the chat user list.
    const userListItemsContainer = document.getElementById('userListItems');
    const listItems = userListItemsContainer.querySelectorAll('li');

    // The list should contain all users *except* the one who is logged in.
    const expectedUserCount = Object.keys(MOCK_USERS_DB).length - 1;
    expect(listItems.length).toBe(expectedUserCount);

    // Verify that the logged-in user's ID is not present in the list items' data attributes.
    const userIdsInList = Array.from(listItems).map(li => li.getAttribute('data-user-id'));
    expect(userIdsInList).not.toContain(MOCK_LOGGED_IN_USER.uid);

    // Verify that the other users are correctly displayed in the list.
    expect(userIdsInList).toContain(MOCK_OTHER_USER_1.uid);
    expect(userIdsInList).toContain(MOCK_OTHER_USER_2.uid);
    
    // Verify the display names of the other users.
    const userNamesInList = Array.from(listItems).map(li => li.textContent.trim());
    expect(userNamesInList).toContain(MOCK_OTHER_USER_1.displayName);
    expect(userNamesInList).toContain(MOCK_OTHER_USER_2.displayName);
  });
});
```