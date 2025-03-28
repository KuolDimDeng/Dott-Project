'use client';

import React, { useState } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';

/**
 * An extremely simple form embedded directly in the main dashboard 
 * that should work regardless of what's happening in the rest of the app
 */
export default function EmbeddedTestForm() {
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  
  // Button handlers for adding text directly (bypassing keyboard input)
  const addToInput = (text) => {
    setInputValue(prev => prev + text);
  };
  
  const addToTextarea = (text) => {
    setTextareaValue(prev => prev + text);
  };
  
  const clearInput = () => {
    setInputValue('');
  };
  
  const clearTextarea = () => {
    setTextareaValue('');
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        my: 3,
        border: '2px solid red',
        maxWidth: '800px',
        mx: 'auto'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Emergency Test Form
      </Typography>
      
      <Typography variant="body2" paragraph>
        This form is directly embedded in the dashboard content with no complex wrappers.
        If you can type in these fields, but not in other forms, there's likely a context-specific issue.
      </Typography>
      
      <form className="emergency-form">
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Test Input Field
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ 
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '16px'
            }}
            placeholder="Type here to test input field"
          />
          
          <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => addToInput('A')}>Add "A"</Button>
            <Button size="small" variant="outlined" onClick={() => addToInput('B')}>Add "B"</Button>
            <Button size="small" variant="outlined" onClick={() => addToInput(' ')}>Add Space</Button>
            <Button size="small" variant="outlined" onClick={clearInput}>Clear</Button>
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Test Textarea
          </label>
          <textarea
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            style={{ 
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '16px',
              minHeight: '100px'
            }}
            placeholder="Type here to test textarea field"
          />
          
          <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => addToTextarea('Sample text')}>
              Add Text
            </Button>
            <Button size="small" variant="outlined" onClick={() => addToTextarea('\n')}>
              Add Line Break
            </Button>
            <Button size="small" variant="outlined" onClick={clearTextarea}>Clear</Button>
          </div>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <p><strong>Input Value:</strong> {inputValue || '(empty)'}</p>
          <p><strong>Textarea Value:</strong> {textareaValue || '(empty)'}</p>
        </div>
      </form>
    </Paper>
  );
}