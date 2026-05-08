// Line 208 - Keep the conditional
{user ? (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all">
        <Avatar className="h-9 w-9">
          {/* Add null check here */}
          <AvatarImage src={user?.avatar || ''} alt={user?.firstName || 'User'} />
          <AvatarFallback className="bg-primary/5 text-primary">
            {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
          </AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
      <DropdownMenuLabel className="font-normal p-4">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-black uppercase tracking-tight leading-none">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {user?.email}
          </p>
        </div>
      </DropdownMenuLabel>
