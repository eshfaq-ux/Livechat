```javascript
import { test, expect } from '@playwright/test';

test.describe('Registration Page File Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local HTML file.
    // The path should be relative to the root of where you run Playwright.
    await page.goto('file://' + __dirname + '/registration.html');
  });

  test('should trigger an alert when uploading without a file', async ({ page }) => {
    // Set up a listener for the 'dialog' event (which includes alerts, confirms, etc.)
    // This must be done BEFORE the action that triggers the dialog.
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.dismiss(); // Close the alert
    });

    // Find the 'Upload' button and click it.
    await page.click('#uploadButton');

    // Assert that the alert message is what we expect.
    expect(alertMessage).toBe('No File Selected ');

    // Verify that the progress indicator did not become visible,
    // confirming the upload process was halted.
    await expect(page.locator('#fileUploadProgress')).not.toBeVisible();
  });
});
```