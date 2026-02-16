import { UserModel } from '../user.model';

describe('UserModel', () => {
  // No automatic cleanup - tests will use unique emails or clean up explicitly
  // This prevents interference with other test files

  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'testPassword123';
      const hash = await UserModel.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await UserModel.hashPassword(password);
      const hash2 = await UserModel.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await UserModel.hashPassword(password);
      const isValid = await UserModel.comparePassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await UserModel.hashPassword(password);
      const isValid = await UserModel.comparePassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const email = 'test1@example.com';
      const password = 'password123';
      
      const user = await UserModel.create(email, password);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(password);
      expect(user.role).toBe('user');
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should create an admin user when role is specified', async () => {
      const email = 'test2@example.com';
      const password = 'password123';
      
      const user = await UserModel.create(email, password, 'admin');
      
      expect(user.role).toBe('admin');
    });

    it('should throw error when creating user with duplicate email', async () => {
      const email = `test3-${Date.now()}@example.com`;
      const password = 'password123';
      
      await UserModel.create(email, password);
      
      await expect(UserModel.create(email, password)).rejects.toThrow();
      
      // Clean up
      const user = await UserModel.findByEmail(email);
      if (user) await UserModel.delete(user.id);
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const email = 'test4@example.com';
      const password = 'password123';
      const created = await UserModel.create(email, password);
      
      const found = await UserModel.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(email);
    });

    it('should return null for non-existent ID', async () => {
      const found = await UserModel.findById('00000000-0000-0000-0000-000000000000');
      
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'test5@example.com';
      const password = 'password123';
      await UserModel.create(email, password);
      
      const found = await UserModel.findByEmail(email);
      
      expect(found).toBeDefined();
      expect(found?.email).toBe(email);
    });

    it('should return null for non-existent email', async () => {
      const found = await UserModel.findByEmail('nonexistent@example.com');
      
      expect(found).toBeNull();
    });

    it('should be case-sensitive', async () => {
      const email = 'test6@example.com';
      const password = 'password123';
      await UserModel.create(email, password);
      
      const found = await UserModel.findByEmail('TEST6@EXAMPLE.COM');
      
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const email1 = 'test7@example.com';
      const email2 = 'test8@example.com';
      const password = 'password123';
      
      await UserModel.create(email1, password);
      await UserModel.create(email2, password);
      
      const users = await UserModel.findAll();
      
      expect(users.length).toBeGreaterThanOrEqual(2);
      const testUsers = users.filter(u => u.email.startsWith('test'));
      expect(testUsers.length).toBeGreaterThanOrEqual(2);
    });

    it('should return users ordered by creation date descending', async () => {
      const users = await UserModel.findAll();
      
      for (let i = 1; i < users.length; i++) {
        expect(users[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          users[i].createdAt.getTime()
        );
      }
    });
  });

  describe('update', () => {
    it('should update user email', async () => {
      const email = 'test9@example.com';
      const newEmail = 'test9-updated@example.com';
      const password = 'password123';
      const created = await UserModel.create(email, password);
      
      const updated = await UserModel.update(created.id, { email: newEmail });
      
      expect(updated).toBeDefined();
      expect(updated?.email).toBe(newEmail);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should update user role', async () => {
      const email = 'test10@example.com';
      const password = 'password123';
      const created = await UserModel.create(email, password);
      
      const updated = await UserModel.update(created.id, { role: 'admin' });
      
      expect(updated).toBeDefined();
      expect(updated?.role).toBe('admin');
    });

    it('should return null for non-existent user', async () => {
      const updated = await UserModel.update('00000000-0000-0000-0000-000000000000', {
        email: 'new@example.com'
      });
      
      expect(updated).toBeNull();
    });

    it('should return user unchanged when no updates provided', async () => {
      const email = 'test11@example.com';
      const password = 'password123';
      const created = await UserModel.create(email, password);
      
      const updated = await UserModel.update(created.id, {});
      
      expect(updated).toBeDefined();
      expect(updated?.email).toBe(email);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const email = 'test12@example.com';
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';
      const created = await UserModel.create(email, oldPassword);
      
      const updated = await UserModel.updatePassword(created.id, newPassword);
      
      expect(updated).toBeDefined();
      expect(updated?.passwordHash).not.toBe(created.passwordHash);
      
      // Verify new password works
      const isValid = await UserModel.comparePassword(newPassword, updated!.passwordHash);
      expect(isValid).toBe(true);
      
      // Verify old password doesn't work
      const isOldValid = await UserModel.comparePassword(oldPassword, updated!.passwordHash);
      expect(isOldValid).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const email = 'test13@example.com';
      const password = 'password123';
      const created = await UserModel.create(email, password);
      
      const deleted = await UserModel.delete(created.id);
      
      expect(deleted).toBe(true);
      
      const found = await UserModel.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const deleted = await UserModel.delete('00000000-0000-0000-0000-000000000000');
      
      expect(deleted).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      const email = 'test14@example.com';
      const password = 'password123';
      await UserModel.create(email, password);
      
      const exists = await UserModel.emailExists(email);
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await UserModel.emailExists('nonexistent@example.com');
      
      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should return total user count', async () => {
      const initialCount = await UserModel.count();
      
      const email1 = 'test15@example.com';
      const email2 = 'test16@example.com';
      const password = 'password123';
      
      await UserModel.create(email1, password);
      await UserModel.create(email2, password);
      
      const newCount = await UserModel.count();
      
      expect(newCount).toBe(initialCount + 2);
    });
  });
});
