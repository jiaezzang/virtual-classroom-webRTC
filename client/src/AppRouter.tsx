import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home/Home';
import ClassRoom from './pages/ClassRoom/ClassRoom';

export default function AppRouter() {
    return (
        <Router>
            <Routes>
                <Route path="/welcome" element={<Home />} />
                <Route path="/classroom" element={<ClassRoom />} />
                <Route path="*" element={<Navigate replace to="/welcome" />} />
            </Routes>
        </Router>
    );
}
