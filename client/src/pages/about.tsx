import { GraduationCap, Target, Users, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About Campus Exchange</h1>
          <p className="text-xl text-gray-600">Your trusted university marketplace</p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center mb-2">
                <Target className="h-6 w-6 text-indigo-600 mr-2" />
                <CardTitle>Our Mission</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Campus Exchange is dedicated to creating a safe, convenient, and student-friendly marketplace
                that connects university students for buying and selling items. We believe in fostering a sustainable
                campus community where students can easily trade textbooks, electronics, furniture, and more—all
                while staying within their campus ecosystem.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center mb-2">
                <Users className="h-6 w-6 text-purple-600 mr-2" />
                <CardTitle>Why Campus Exchange?</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span><strong>Student-Focused:</strong> Built specifically for university communities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span><strong>Safe & Secure:</strong> Email verification and seller verification system</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span><strong>Easy to Use:</strong> Simple, mobile-friendly interface</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span><strong>Integrated Payments:</strong> Secure payment processing with Stripe</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span><strong>PWA Technology:</strong> Install on your phone for app-like experience</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center mb-2">
                <Heart className="h-6 w-6 text-red-600 mr-2" />
                <CardTitle>Our Values</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4 text-gray-700">
                <div>
                  <h3 className="font-semibold mb-1">Sustainability</h3>
                  <p className="text-sm">Promoting reuse and reducing waste in campus communities</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Trust</h3>
                  <p className="text-sm">Building a verified marketplace you can rely on</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Community</h3>
                  <p className="text-sm">Connecting students and fostering campus connections</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Affordability</h3>
                  <p className="text-sm">Making student life more affordable through peer-to-peer trading</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Join thousands of students already using Campus Exchange to buy and sell on campus.
          </p>
          <a
            href="/auth"
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Get Started Today
          </a>
        </div>
      </div>
    </div>
  );
}
