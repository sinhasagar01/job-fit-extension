import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { FitResult } from '../utils/scorer';

const LABELS: Record<string, string> = {
  skillsMatch: 'Skills',
  experienceLevel: 'Experience',
  domainIndustry: 'Domain',
  keywordCoverage: 'Keywords',
  educationCerts: 'Education',
};

interface Props {
  dimensions: FitResult['dimensions'];
}

export default function DimensionRadar({ dimensions }: Props) {
  const data = Object.entries(dimensions).map(([key, value]) => ({
    subject: LABELS[key] ?? key,
    value,
  }));

  return (
    <ResponsiveContainer width="100%" height={210}>
      <RadarChart cx="50%" cy="50%" outerRadius={75} data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 10]} tickCount={3} tick={false} axisLine={false} />
        <Radar dataKey="value" fill="#818cf8" stroke="#4f46e5" fillOpacity={0.4} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
