import * as Cesium from 'cesium'
import React, { useEffect } from "react";
import "./App.css";

function App() {
    
    useEffect(() => {
      // 初始化Cesium
      Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlZjdlNTE2Mi05MjE4LTQ1OGMtOGQ1ZS0wODdiNzI5YWQxYzYiLCJpZCI6MjI5NDYzLCJpYXQiOjE3MjEzOTA3OTR9.Vyt-kvvNogPDPw4y74AMwsJDHUUBuhHtwyGDuCBDtSw";
      const viewer = new Cesium.Viewer("cesiumContainer", {
        infoBox: false,
      });

      return () => {  
        viewer.destroy();  
      };  
    }, [])

    return (
      <div id="cesiumContainer"/>
    );
}

export default App;
