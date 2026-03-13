import { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateStoryModal from './components/CreateStoryModal';
import SceneEditor from './pages/SceneEditor';

// Import thumbnails
import storyThumb1 from './assets/images/img_thumb_1.webp';
import storyThumb2 from './assets/images/img_thumb_2.webp';
import storyThumb3 from './assets/images/img_thumb_3.webp';

// Mock data
const INITIAL_STORIES_DATA = [
  {
    id: '1',
    title: 'The Enchanted Kingdom',
    thumbnail: storyThumb1,
    author: 'DevMaster',
    plays: 12400,
    genre: 'Fantasy',
    isPublished: true,
  },
  {
    id: '2',
    title: 'Shadows of the Ancient Forest',
    thumbnail: storyThumb2,
    author: 'StoryWeaver',
    plays: 8730,
    genre: 'Mystery',
    isPublished: true,
  },
  {
    id: '3',
    title: 'Neon City Chronicles',
    thumbnail: storyThumb3,
    author: 'CyberWriter',
    plays: 3200,
    genre: 'Sci-Fi',
    isPublished: false,
  },
];

function App() {
  const [stories, setStories] = useState(INITIAL_STORIES_DATA);
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateNewStory = (prompt: string) => {
    console.log('Creating story with prompt:', prompt);
    const newId = Date.now().toString();
    const newStory = {
      id: newId,
      title: 'Untitled Story',
      thumbnail: storyThumb1, // Placeholder
      author: 'You',
      plays: 0,
      genre: 'New',
      isPublished: false,
    };
    setStories(prev => [...prev, newStory]);
    setIsCreateModalOpen(false);
    
    // Switch to editor
    setActiveStoryId(newId);
    setCurrentView('editor');
  };

  const activeStory = stories.find(s => s.id === activeStoryId);

  return (
    <div className="bg-mesh noise-overlay relative min-h-screen overflow-x-hidden pt-16">
      <Navbar onCreateStory={handleOpenCreateModal} showCreateStory={currentView === 'dashboard'} />
      
      {currentView === 'dashboard' ? (
        <Dashboard
          stories={stories}
          onCreateStory={handleOpenCreateModal}
          onSelectStory={(id) => {
            setActiveStoryId(id);
            setCurrentView('editor');
          }}
        />
      ) : (
        <SceneEditor
          story={activeStory}
          onBack={() => setCurrentView('dashboard')}
          isLoadingStoryboard={false}
        />
      )}
      
      <CreateStoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateNewStory}
      />
    </div>
  );
}

export default App;
