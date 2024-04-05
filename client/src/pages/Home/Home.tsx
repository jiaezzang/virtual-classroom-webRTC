import { useNavigate } from 'react-router-dom';
/**
 * ClassRoom 진입 전 Home 컴포넌트
 * @returns {JSX.Element} Home 컴포넌트
 */
export default function Home() {
    const navigate = useNavigate();
    /**
     * classRoom으로 이동한다.
     */
    const redirectToClassRooom = (userType: TUser) => {
        navigate('/classroom');
        sessionStorage.setItem('type', userType);
    };
    return (
        <div className="bg-blue-100 w-screen h-screen flex flex-col gap-4 justify-center items-center">
            <button
                className="bg-gradient-to-br from-blue-300 to-blue-100 w-[300px] h-[80px] rounded-full shadow-xl text-xl text-white font-extrabold"
                onClick={() => redirectToClassRooom('teacher')}
            >
                TEACHER
            </button>
            <button
                className="bg-gradient-to-br from-blue-100 to-blue-300 w-[300px] h-[80px] rounded-full shadow-xl text-xl text-white font-extrabold"
                onClick={() => redirectToClassRooom('learner')}
            >
                LEARNER
            </button>
        </div>
    );
}
