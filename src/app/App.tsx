import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../features/home/HomePage'
import { StarterPage } from '../features/starter/StarterPage'
import { RecipesPage } from '../features/recipes/RecipesPage'
import { PlanPage } from '../features/plan/PlanPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="starter" element={<StarterPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="plan" element={<PlanPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
