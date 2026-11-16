const ContextController = {
   async saveUserPrompt(prompt, realityId = 1) {
      app.dBug('ContextController: Saving user prompt', prompt);
      
      const response = await app.post('chat/save', { 
          prompt: prompt, 
          reality_id: realityId 
      });
      
      app.dBug('ChatController save response', response);
      return response;
   } 
};