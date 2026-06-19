import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../features/home/HomePage'
import { StarterListPage } from '../features/starter/StarterListPage'
import { NewStarterPage } from '../features/starter/NewStarterPage'
import { StarterDetailPage } from '../features/starter/StarterDetailPage'
import { FeedFormPage } from '../features/starter/FeedFormPage'
import { RecipesPage } from '../features/recipes/RecipesPage'
import { PlanPage } from '../features/plan/PlanPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="starter" element={<StarterListPage />} />
          <Route path="starter/new" element={<NewStarterPage />} />
          <Route path="starter/:starterId" element={<StarterDetailPage />} />
          <Route path="starter/:starterId/feed" element={<FeedFormPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="plan" element={<PlanPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
