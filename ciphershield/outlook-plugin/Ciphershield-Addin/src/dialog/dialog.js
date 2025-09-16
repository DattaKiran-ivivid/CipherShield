Office.onReady(() => {
  Office.context.dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
    const message = JSON.parse(arg.message);
    const content = document.getElementById('content');
    if (message.type === 'error') {
      content.textContent = `Error: ${message.message}`;
    } else if (message.type === 'results') {
      let text = 'Anonymized successfully.\n';
      if (message.items.length > 0) {
        text += 'PII Details:\n';
        message.items.forEach(item => {
          text += `- ${item.pii_type} (Confidence: ${item.confidence}): "${item.original}" -> "${item.anonymized}"\n`;
        });
      } else {
        text += 'No PII detected.';
      }
      content.textContent = text;
    }
  });

  document.getElementById('close').addEventListener('click', () => {
    Office.context.dialog.close();
  });
});