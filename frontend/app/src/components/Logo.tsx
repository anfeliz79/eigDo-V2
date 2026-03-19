export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-2xl';
  return (
    <span className={`${textSize} font-extrabold tracking-tight`}>
      <span className="text-gray-900">eig</span>
      <span className="text-blue-600">Do</span>
    </span>
  );
}
