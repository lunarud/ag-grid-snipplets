.workflow-container {
  display: flex;
  height: 100vh;
  width: 100%;
}

.diagram-canvas {
  flex: 1;
  border: 1px solid #ccc;
}

.details-panel {
  width: 300px;
  padding: 20px;
  border-left: 1px solid #ccc;
  background-color: #f9f9f9;

  h3 {
    margin-top: 0;
  }

  pre {
    white-space: pre-wrap;
    font-family: monospace;
  }

  button {
    margin-top: 10px;
    padding: 5px 10px;
  }
}