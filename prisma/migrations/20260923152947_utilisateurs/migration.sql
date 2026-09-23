-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'po', 'client');

-- CreateTable
CREATE TABLE "Entreprise" (
    "siren" CHAR(9) NOT NULL,
    "raisonSociale" VARCHAR(20) NOT NULL,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("siren")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" SERIAL NOT NULL,
    "login" VARCHAR(50) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "siren" CHAR(9),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_login_key" ON "Utilisateur"("login");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_siren_fkey" FOREIGN KEY ("siren") REFERENCES "Entreprise"("siren") ON DELETE SET NULL ON UPDATE CASCADE;
