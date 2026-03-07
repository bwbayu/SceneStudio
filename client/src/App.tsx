import { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateStoryModal from './components/CreateStoryModal';

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateNewStory = (prompt: string) => {
    console.log('Creating story with prompt:', prompt);
    const newStory = {
      id: Date.now().toString(),
      title: 'Untitled Story',
      thumbnail: storyThumb1, // Placeholder
      author: 'You',
      plays: 0,
      genre: 'New',
      isPublished: false,
    };
    setStories(prev => [...prev, newStory]);
    setIsCreateModalOpen(false);
  };

  const handleUpdateStories = (updatedStories: any[]) => {
    setStories(updatedStories);
  };

  return (
    <div className="bg-mesh noise-overlay relative min-h-screen overflow-x-hidden">
      <Navbar onCreateStory={handleOpenCreateModal} />
      <Dashboard 
        stories={stories} 
        setStories={handleUpdateStories}
        onCreateStory={handleOpenCreateModal} 
      />
      
      <CreateStoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateNewStory}
      />
    </div>
  );
}

export default App;
