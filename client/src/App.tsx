import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateStoryModal from './components/CreateStoryModal';
import QuestionnaireModal from './components/QuestionnaireModal';
import PipelineLoadingOverlay from './components/PipelineLoadingOverlay';
import SettingsModal from './components/SettingsModal';
import SceneEditor from './pages/SceneEditor';
import { useStoryboards, useDashboardStats } from './hooks/useStoryboards';
import { useStartPipeline, useAnswerQuestions, usePipelineStatus } from './hooks/usePipeline';
import type { ClarificationQuestion } from './api';

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Initializing pipeline...',
  processing_agents: 'Crafting your story world...',
  processing_assets: 'Building characters & themes...',
  generating_images: 'Generating visual assets...',
  generating_videos: 'Bringing scenes to life...',
  storyboard_complete: 'Storyboard ready! Loading your scenes...',
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: storyboards, isLoading: isLoadingStoryboards } = useStoryboards();
  const stats = useDashboardStats(storyboards);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [isPipelineProcessing, setIsPipelineProcessing] = useState(false);
  const [pipelineStatusText, setPipelineStatusText] = useState('Initializing pipeline...');
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(localStorage.getItem('gemini_api_key')));
  const [apiError, setApiError] = useState<string | null>(null);

  const startPipeline = useStartPipeline();

  // Listen for API key errors dispatched by the axios interceptor
  useEffect(() => {
    const handler = ((_e: CustomEvent) => {
      setApiError('Your Gemini API key appears to be invalid. Please update it in Settings.');
      setIsSettingsOpen(true);
    }) as EventListener;
    window.addEventListener('gemini-api-key-error', handler);
    return () => window.removeEventListener('gemini-api-key-error', handler);
  }, []);
  const answerQuestions = useAnswerQuestions();

  // Pipeline status polling — react to changes via onPipelineStatusChange callback
  const handlePipelineStatusChange = useCallback((status: ReturnType<typeof usePipelineStatus>['data']) => {
    if (!status) return;

    if (STATUS_MESSAGES[status.status]) {
      setPipelineStatusText(STATUS_MESSAGES[status.status]);
    }

    if (status.status === 'clarifying' && status.questions) {
      setIsPipelineProcessing(false);
      setQuestions(status.questions);
      setIsQuestionnaireOpen(true);
    }

    if (status.status === 'generation_complete' && status.story_id) {
      setIsPipelineProcessing(false);
      navigate(`/story/${status.story_id}`);
    }

    if (status.status === 'storyboard_complete' && status.story_id) {
      setIsPipelineProcessing(false);
      navigate(`/story/${status.story_id}`);
    }

    if (status.status === 'error') {
      setIsPipelineProcessing(false);
      const errMsg = status.error || 'Pipeline encountered an error.';
      if (errMsg.toLowerCase().includes('api_key') || errMsg.toLowerCase().includes('api key')) {
        setApiError('Your Gemini API key is invalid or expired. Please update it in Settings.');
        setIsSettingsOpen(true);
      } else {
        setApiError(errMsg);
      }
    }
  }, [navigate]);

  usePipelineStatus(activeSessionId, handlePipelineStatusChange);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateNewStory = async (prompt: string) => {
    setIsCreateModalOpen(false);
    setIsPipelineProcessing(true);
    setPipelineStatusText('Initializing pipeline...');

    try {
      const response = await startPipeline.mutateAsync({ script: prompt });
      setActiveSessionId(response.session_id);

      if (response.status === 'questions' && response.questions) {
        setIsPipelineProcessing(false);
        setQuestions(response.questions);
        setIsQuestionnaireOpen(true);
      }
      // If status is "processing", polling will auto-start via usePipelineStatus
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to start pipeline.';
      setApiError(msg);
      setIsPipelineProcessing(false);
    }
  };

  const handleAnswerQuestions = async (answers: Record<number, { selected: string[]; otherInput: string }>) => {
    if (!activeSessionId) return;

    setIsQuestionnaireOpen(false);
    setIsPipelineProcessing(true);
    setPipelineStatusText('Processing your answers...');

    // Transform answers to API format
    const formattedAnswers = questions.map((q, idx) => {
      const answer = answers[idx];
      const selectedOptions = answer.selected.includes('Other') && answer.otherInput
        ? [...answer.selected.filter(s => s !== 'Other'), answer.otherInput]
        : answer.selected;
      return {
        question: q.question,
        selected_options: selectedOptions,
      };
    });

    try {
      const response = await answerQuestions.mutateAsync({
        sessionId: activeSessionId,
        answers: { answers: formattedAnswers },
      });

      if (response.status === 'questions' && response.questions) {
        setIsPipelineProcessing(false);
        setQuestions(response.questions);
        setIsQuestionnaireOpen(true);
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to process answers.';
      setApiError(msg);
      setIsPipelineProcessing(false);
    }
  };

  const isDashboard = location.pathname === '/';
  const showGenerateFeatures = import.meta.env.DEV || hasApiKey;

  return (
    <div className="bg-mesh noise-overlay relative min-h-screen overflow-x-hidden pt-16">
      {apiError && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-between bg-red-900/90 px-6 py-3 text-sm text-red-100 backdrop-blur">
          <span>{apiError}</span>
          <button onClick={() => setApiError(null)} className="ml-4 text-red-300 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Navbar
        onCreateStory={handleOpenCreateModal}
        onOpenSettings={() => setIsSettingsOpen(true)}
        showCreateStory={isDashboard && showGenerateFeatures}
      />

      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              storyboards={storyboards ?? []}
              stats={stats}
              isLoading={isLoadingStoryboards}
              onCreateStory={handleOpenCreateModal}
              onSelectStory={(storyId: string) => navigate(`/story/${storyId}`)}
              showGenerateFeatures={showGenerateFeatures}
            />
          }
        />
        <Route path="/story/:storyId" element={<SceneEditor />} />
      </Routes>

      <CreateStoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateNewStory}
        isCreating={startPipeline.isPending}
      />

      <QuestionnaireModal
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        questions={questions}
        onGenerate={handleAnswerQuestions}
      />

      <PipelineLoadingOverlay
        isVisible={isPipelineProcessing}
        statusText={pipelineStatusText}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => setHasApiKey(Boolean(localStorage.getItem('gemini_api_key')))}
      />
    </div>
  );
}

export default App;
