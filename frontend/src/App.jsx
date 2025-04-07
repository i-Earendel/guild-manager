import { useState, useEffect, useCallback } from 'react';
import './App.css'; // Asegúrate de tener este archivo o ajusta los estilos

function App() {
  // --- State Variables ---
  const [guilds, setGuilds] = useState([]); // Almacena la lista de gremios
  const [isLoading, setIsLoading] = useState(false); // Indica si se están cargando los gremios
  const [error, setError] = useState(null); // Almacena mensajes de error (fetch o create)
  const [newGuildName, setNewGuildName] = useState(''); // Controla el valor del input para nuevo gremio
  const [isCreating, setIsCreating] = useState(false); // Indica si se está procesando la creación
  const [editingGuildId, setEditingGuildId] = useState(null); // ID del gremio en edición
  const [editFormData, setEditFormData] = useState({ name: '', level: '' }); // Datos del form de edición
  const [isUpdating, setIsUpdating] = useState(false); // Feedback visual para actualización

  // --- Backend URL ---
  // !! IMPORTANTE: Reemplaza esta URL con la URL REAL que IDX te da para el puerto 3001 !!
  const BACKEND_URL = 'https://3001-idx-guild-manager-1743801121420.cluster-duylic2g3fbzerqpzxxbw6helm.cloudworkstations.dev'; // ¡VERIFICA ESTO!

  // --- Función para Cargar Gremios ---
  const fetchGuilds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log(`Fetching guilds from: ${BACKEND_URL}/api/guilds`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/guilds`);
      if (!response.ok) {
        let errorBody = null;
        try {
            errorBody = await response.json();
        } catch (e) { /* Ignorar si el cuerpo no es JSON */ }
        console.error("Fetch error response:", errorBody);
        throw new Error(`HTTP error! status: ${response.status} ${errorBody?.error ? `- ${errorBody.error}` : ''}`);
      }
      const data = await response.json();
      setGuilds(data);
      console.log("Guilds loaded:", data);
    } catch (err) {
      console.error("Failed to fetch guilds:", err);
      setError(`Failed to load guilds: ${err.message}. Check backend status and URL.`);
      setGuilds([]);
    } finally {
      setIsLoading(false);
    }
  }, [BACKEND_URL]);

  // --- Efecto para Cargar Gremios al Montar el Componente ---
  useEffect(() => {
    fetchGuilds();
  }, [fetchGuilds]);

  // --- Función para Manejar la Creación de un Gremio ---
  const handleCreateGuild = async (event) => {
    event.preventDefault();
    if (!newGuildName.trim()) {
      setError("Guild name cannot be empty.");
      return;
    }
    setIsCreating(true);
    setError(null);
    console.log(`Attempting to create guild: ${newGuildName}`);
    try {
      const response = await fetch(`${BACKEND_URL}/api/guilds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGuildName }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${responseData.error ? `- ${responseData.error}` : '(No details provided)'}`);
      }
      console.log("Guild created successfully:", responseData);
      setGuilds(prevGuilds => [...prevGuilds, responseData]);
      setNewGuildName('');
      setError(null);
    } catch (err) {
      console.error("Failed to create guild:", err);
      setError(`Failed to create guild: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // --- Función para Manejar la Eliminación de un Gremio ---
  const handleDeleteGuild = useCallback(async (guildIdToDelete) => {
    if (!window.confirm(`Are you sure you want to delete the guild with ID ${guildIdToDelete}?`)) {
      return;
    }
    console.log(`Attempting to delete guild with ID: ${guildIdToDelete}`);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/guilds/${guildIdToDelete}`, {
        method: 'DELETE',
      });
      if (response.status === 204) {
        console.log("Guild deleted successfully (204 No Content).");
        setGuilds(prevGuilds => prevGuilds.filter(guild => guild.guild_id !== guildIdToDelete));
      } else if (response.ok) {
        const responseData = await response.json().catch(() => null);
        console.log("Guild deleted successfully:", responseData || '(No response body)');
        setGuilds(prevGuilds => prevGuilds.filter(guild => guild.guild_id !== guildIdToDelete));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(`HTTP error! status: ${response.status} ${errorData.error ? `- ${errorData.error}` : '(No details provided)'}`);
      }
    } catch (err) {
      console.error("Failed to delete guild:", err);
      setError(`Failed to delete guild: ${err.message}`);
    }
  }, [BACKEND_URL]);

  // --- Funciones para Edición ---
  const handleEditClick = (guild) => {
    setEditingGuildId(guild.guild_id);
    setEditFormData({ name: guild.name, level: guild.level.toString() });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingGuildId(null);
    setEditFormData({ name: '', level: '' });
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // --- Función CORREGIDA para Manejar la Actualización ---
  const handleUpdateGuild = async (event) => {
     event.preventDefault();
     if (!editingGuildId) return;

     const { name, level } = editFormData;

     // Validación básica
     if (!name.trim()) {
         setError("Guild name cannot be empty.");
         return;
     }
     const numericLevel = parseInt(level, 10);
     if (isNaN(numericLevel) || numericLevel < 1) {
          setError("Level must be a positive number.");
          return;
     }

     setIsUpdating(true);
     setError(null);

     // Definir URL y Body una vez
     const updateUrl = `${BACKEND_URL}/api/guilds/${editingGuildId}`;
     const updateBody = { name: name.trim(), level: numericLevel };

     // --- ÚNICO Y CORRECTO BLOQUE TRY...CATCH...FINALLY ---
     try {
         // Logs justo antes del fetch
         console.log("UPDATE Fetch URL:", updateUrl);
         console.log("UPDATE Fetch Method:", 'PUT'); // This will be PUT again

         console.log("UPDATE Fetch Body:", JSON.stringify(updateBody));

         const response = await fetch(updateUrl, {
             method: 'PUT',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(updateBody), // Send data again as JSON
         });

         const responseData = await response.json().catch(() => null);

         if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status} ${responseData?.error ? `- ${responseData.error}` : '(No details provided)'}`);
         }

         console.log("Guild updated successfully:", responseData);

         setGuilds(prevGuilds => prevGuilds.map(guild =>
             guild.guild_id === editingGuildId ? responseData : guild
         ));

         setEditingGuildId(null);
         setEditFormData({ name: '', level: '' });

     } catch (err) {
         console.error("Failed to update guild:", err);
         setError(`Failed to update guild: ${err.message}`);
     } finally {
         setIsUpdating(false);
     }
     // --- FIN DEL BLOQUE ÚNICO ---
 };

  // --- Estructura JSX del Componente ---
  return (
    <div className="App">
      <h1>Guild Management (React/Node)</h1>

      {/* Formulario para Crear Nuevo Gremio */}
      <form onSubmit={handleCreateGuild} style={{ marginBottom: '20px' }}>
        <h2>Create New Guild</h2>
        <input
          type="text"
          value={newGuildName}
          onChange={(e) => setNewGuildName(e.target.value)}
          placeholder="Enter guild name"
          disabled={isCreating}
          required
          style={{ marginRight: '10px' }}
        />
        <button type="submit" disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Guild'}
        </button>
      </form>

      {/* Botón para Recargar Manualmente */}
      <button onClick={fetchGuilds} disabled={isLoading} style={{ marginBottom: '10px' }}>
        {isLoading ? 'Loading...' : 'Reload Guilds'}
      </button>

      {/* Área para Mostrar Errores */}
      {error && <p style={{ color: 'red', marginTop: '10px', border: '1px solid red', padding: '10px' }}>Error: {error}</p>}

      {/* Sección de Lista de Gremios */}
      <h2>Guild List</h2>
      {isLoading && !error && <p>Loading guilds...</p>}
      {!isLoading && !error && guilds.length === 0 && <p>No guilds found or backend unavailable.</p>}

      <ul>
        {guilds.map((guild) => (
          <li key={guild.guild_id} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
            {editingGuildId === guild.guild_id ? (
              // --- Formulario de Edición (Inline) ---
              <form onSubmit={handleUpdateGuild}>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  required
                  disabled={isUpdating}
                  style={{ marginRight: '5px' }}
                />
                <input
                  type="number"
                  name="level"
                  value={editFormData.level}
                  onChange={handleEditFormChange}
                  required
                  min="1"
                  disabled={isUpdating}
                  style={{ marginRight: '10px', width: '60px' }}
                />
                <button type="submit" disabled={isUpdating} style={{ marginRight: '5px', backgroundColor: '#4CAF50', color: 'white' }}>
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={handleCancelEdit} disabled={isUpdating}>
                  Cancel
                </button>
              </form>
            ) : (
              // --- Vista Normal del Gremio ---
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {guild.name} (Level: {guild.level})
                </span>
                <div> {/* Contenedor para botones */}
                    <button
                        onClick={() => handleEditClick(guild)}
                        style={{ marginRight: '5px', padding: '3px 8px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDeleteGuild(guild.guild_id)}
                        style={{ padding: '3px 8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                    >
                        Delete
                    </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
