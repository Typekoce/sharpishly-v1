const ContextController = {
   async saveUserPrompt(prompt) {
      app.dBug('ContextController: Saving user prompt', prompt);
      
      // Send the user prompt to the backend chat/save endpoint via POST
      const result = await app.post('chat/save', { prompt: prompt });
      app.dBug('ChatController save response', result);
   } 
};