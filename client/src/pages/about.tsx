import { GraduationCap, Target, Users, Heart, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth-context';

export default function About() {
  const { user } = useAuth();
  const authLink = user ? `/?ref=${user.id}` : '/auth';
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About The Hub</h1>
          <p className="text-xl text-gray-600 font-medium">The Student Marketplace</p>
        </div>

        <div className="grid gap-8 mb-12">
          <Card className="border-none shadow-xl bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center mb-2">
                <Target className="h-6 w-6 text-indigo-600 mr-2" />
                <CardTitle className="text-2xl font-black uppercase tracking-tight">Our Mission</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed text-lg">
                The Hub is dedicated to creating a safe, convenient, and inclusive marketplace 
                that connects students of all levels—from high school to university—and their 
                trusted associates. We believe in fostering a sustainable, student-first economy 
                where entrepreneurs can launch their first brands and buyers can find essentials 
                at community prices.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-black text-white p-8">
              <div className="flex items-center mb-2">
                <Users className="h-6 w-6 text-primary mr-2" />
                <CardTitle className="text-2xl font-black uppercase tracking-tight">Why Choose The Hub?</CardTitle>
              </div>
              <CardDescription className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Empowering student commerce</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight">Student-First</h4>
                      <p className="text-xs text-gray-500 font-medium">Built specifically for education communities and those who support student life.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight">Entrepreneurial Launchpad</h4>
                      <p className="text-xs text-gray-500 font-medium">Giving students the professional tools to start and scale their first business ventures.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight">Verified Community</h4>
                      <p className="text-xs text-gray-500 font-medium">Secure verification process to ensure a trustworthy environment for students and partners.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight">Eco-Sustainable</h4>
                      <p className="text-xs text-gray-500 font-medium">Encouraging second-hand trading and local deals to reduce waste in our communities.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center mb-2">
                <Heart className="h-6 w-6 text-red-600 mr-2" />
                <CardTitle className="text-2xl font-black uppercase tracking-tight">Our Values</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <h3 className="font-black text-xs uppercase tracking-widest mb-2">Inclusivity</h3>
                  <p className="text-sm text-gray-600 font-medium">Connecting students from all educational levels and their verified associates.</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <h3 className="font-black text-xs uppercase tracking-widest mb-2">Trust</h3>
                  <p className="text-sm text-gray-600 font-medium">Building a verified peer-to-peer marketplace you can rely on for every transaction.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-6">
            Join thousands of student entrepreneurs and savvy buyers today.
          </p>
          <Link
            href={authLink}
            className="inline-block bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary transition-all duration-300 shadow-xl shadow-black/10"
          >
            Get Started Today
          </Link>
        </div>
      </div>
    </div>
  );
}
