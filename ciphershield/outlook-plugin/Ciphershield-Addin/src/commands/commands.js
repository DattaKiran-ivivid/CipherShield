// src/commands.js
(function () {
  Office.onReady(() => {
    // Initialized
  });
})();

export async function anonymiseText(event) {
  Office.context.mailbox.item.body.getAsync("html", { asyncContext: event }, async function (bodyResult) {
    if (bodyResult.status !== Office.AsyncResultStatus.Succeeded) {
      console.error('Body fetch failed:', bodyResult.error);
      event.completed();
      return;
    }

    Office.context.mailbox.item.getSelectedDataAsync("text", async function (selectResult) {
      let textToSend = '';
      if (selectResult.status === Office.AsyncResultStatus.Succeeded && selectResult.value.data) {
        textToSend = selectResult.value.data;
      } else {
        // Strip HTML tags for plain text
        textToSend = bodyResult.value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }

      if (!textToSend) {
        Office.context.ui.displayDialogAsync('https://localhost:3000/dialog.html', { height: 20, width: 30 }, function (asyncResult) {
          const dialog = asyncResult.value;
          dialog.messageChild(JSON.stringify({ type: 'error', message: 'No text selected or body is empty.' }));
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            dialog.close();
            event.completed();
          });
        });
        return;
      }

      try {
        const response = await fetch('https://localhost:8000/process_text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSend,
            action: 'anonymize',
            mappings: [],
            custom_recognizers: []
          })
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const anonymisedText = data.text;
        const items = data.items;

        // Replace text
        if (selectResult.value.data) {
          Office.context.mailbox.item.body.setSelectedDataAsync(anonymisedText, { coercionType: 'text' });
        } else {
          Office.context.mailbox.item.body.setAsync(anonymisedText, { coercionType: 'text' });
        }

        // Show PII details in dialog
        Office.context.ui.displayDialogAsync('https://localhost:3000/dialog.html', { height: 30, width: 40 }, function (asyncResult) {
          const dialog = asyncResult.value;
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            dialog.close();
            event.completed();
          });
          dialog.messageChild(JSON.stringify({
            type: 'results',
            items: items,
            text: anonymisedText
          }));
        });
      } catch (error) {
        console.error('Error:', error);
        Office.context.ui.displayDialogAsync('https://localhost:3000/dialog.html', { height: 20, width: 30 }, function (asyncResult) {
          const dialog = asyncResult.value;
          dialog.messageChild(JSON.stringify({ type: 'error', message: error.message }));
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            dialog.close();
            event.completed();
          });
        });
      }
    });
  });
}