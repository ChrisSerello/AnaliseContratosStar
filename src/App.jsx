import { useState } from "react";
import { Database } from "lucide-react";
import { C }                         from "./constants/design.js";
import { DEMO_DATA }                  from "./data/mockData.js";
import { Sidebar, Header }           from "./components/Layout.jsx";
import { Btn }                       from "./components/Primitives.jsx";
import { UploadPage }                from "./pages/UploadPage.jsx";
import { DashboardPage }             from "./pages/DashboardPage.jsx";
import { RecordsPage }               from "./pages/RecordsPage.jsx";
import { StagesPage, SettingsPage }  from "./pages/StagesAndSettings.jsx";
import { RecusadosPage }             from "./pages/RecusadosPage.jsx";
import { ConversaoPage }             from "./pages/ConversaoPage.jsx";

export default function App() {
  const [page,        setPage]        = useState("import");
  const [data,        setData]        = useState([]);
  const [stageFilter, setStageFilter] = useState("");

  const hasData = data.length > 0;
  const handleImport     = (records) => { setData(records); setPage("dashboard"); };
  const handleLoadDemo   = ()        => { setData(DEMO_DATA); setPage("dashboard"); };
  const handleStageClick = (stage)   => { setStageFilter(stage); setPage("records"); };

  const noDataPages = ["import","settings","recusados","conversao"];

  return (
    <div style={{ display:"flex", height:"100vh", minHeight:600, background:C.bg,
      overflow:"hidden", position:"relative",
      fontFamily:"'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:#D4D1CC;border-radius:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        input::placeholder{color:#9AA3AE;}
        select option{color:#1C1F24;}
      `}</style>

      <Sidebar page={page} setPage={setPage} hasData={hasData} />

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <Header page={page} hasData={hasData} onNewImport={() => setPage("import")} />
        <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
          {page==="import"    && <UploadPage onImport={handleImport} onLoadDemo={handleLoadDemo}/>}
          {page==="dashboard" && hasData && <DashboardPage data={data} onStageClick={handleStageClick}/>}
          {page==="records"   && hasData && <RecordsPage data={data} initialStage={stageFilter} onStageReset={()=>setStageFilter("")}/>}
          {page==="stages"    && hasData && <StagesPage data={data} onFilterClick={handleStageClick}/>}
          {page==="settings"  && <SettingsPage/>}
          {page==="recusados" && hasData && <RecusadosPage data={data}/>}
          {page==="conversao" && hasData && <ConversaoPage data={data}/>}
          {!hasData && !noDataPages.includes(page) && <EmptyState onGoToImport={()=>setPage("import")}/>}
          {(page==="recusados"||page==="conversao") && !hasData && <EmptyState onGoToImport={()=>setPage("import")}/>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onGoToImport }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100%", gap:11 }}>
      <Database size={34} color={C.txm}/>
      <div style={{ fontSize:13, fontWeight:600, color:C.txt }}>Nenhum dado importado</div>
      <div style={{ fontSize:11, color:C.txs }}>Importe uma planilha para visualizar o dashboard</div>
      <Btn onClick={onGoToImport}>Ir para Importação</Btn>
    </div>
  );
}
