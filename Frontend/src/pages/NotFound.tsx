import { useNavigate } from "react-router-dom";

const NotFound = () => {
    const navigate = useNavigate();
    return (
        <div className='flex flex-col items-center justify-center min-h-screen gap-8'>
            <h1 className='text-2xl font-semibold'>Page Not Found</h1>
            <button className='px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition' onClick={() => navigate('/')}>Go to Home</button>
        </div>
    )
}

export default NotFound