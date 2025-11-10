'use client';

import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { signInAnonymously } from 'firebase/auth';

export function AuthContent() {
  const { auth, user, isUserLoading } = useFirebase();
  const avatarImage = PlaceHolderImages.find((p) => p.id === 'user-avatar');

  if (isUserLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        {avatarImage && <AvatarImage src={user.photoURL || avatarImage.imageUrl} alt={user.displayName || "User Avatar"} />}
        <AvatarFallback>{user.displayName?.charAt(0) || 'A'}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{user.isAnonymous ? 'Usuário Anônimo' : user.displayName || 'Usuário'}</span>
        <span className="text-xs text-muted-foreground">
          {user.email || 'ID: ' + user.uid.substring(0, 6)}
        </span>
      </div>
    </div>
  );
}
